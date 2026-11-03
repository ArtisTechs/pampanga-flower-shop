import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { HttpError } from "../middleware/errorHandler.js";
import { pool } from "./pool.js";

/** Stock one order takes: from an inventory item (customizer flower/filler) or a ready-made product. */
export interface StockNeed {
  source: "inventory" | "product";
  id: string;
  name: string;
  unit: string;
  quantity: number;
  /** Customizer flowers: the color taken; its own count goes down along with the flower's total. */
  color?: string;
}

interface StockLeftRow extends RowDataPacket {
  stock: number;
}

const STOCK_TABLES = {
  inventory: { table: "inventory_items", column: "current_stock", ledgerColumn: "inventory_item_id" },
  product: { table: "products", column: "stock", ledgerColumn: "product_id" }
} as const;

// Takes the stock inside the order's transaction and records it in order_stock. Each UPDATE only succeeds while
// enough is left, so two customers can't both buy the last stems. Needs are merged and taken in a fixed order to
// avoid deadlocks between concurrent orders.
export const reserveStock = async (connection: PoolConnection, orderId: string, needs: StockNeed[]) => {
  const merged = new Map<string, StockNeed>();
  for (const need of needs) {
    const key = `${need.source}:${need.id}:${need.color ?? ""}`;
    const existing = merged.get(key);
    merged.set(key, existing ? { ...existing, quantity: existing.quantity + need.quantity } : { ...need });
  }

  const sorted = [...merged.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, need]) => need);
  for (const need of sorted) {
    const { table, column } = STOCK_TABLES[need.source];
    if (need.color) {
      const [colorResult] = await connection.query<ResultSetHeader>(
        `UPDATE inventory_color_stock SET current_stock = current_stock - ?
         WHERE inventory_item_id = ? AND color_name = ? AND current_stock >= ?`,
        [need.quantity, need.id, need.color, need.quantity]
      );
      if (colorResult.affectedRows === 0) {
        const [[row]] = await connection.query<StockLeftRow[]>(
          "SELECT current_stock AS stock FROM inventory_color_stock WHERE inventory_item_id = ? AND color_name = ?",
          [need.id, need.color]
        );
        const left = row?.stock ?? 0;
        const label = `${need.color} ${need.name}`;
        throw new HttpError(
          409,
          left > 0 ? `Only ${left} ${need.unit} of ${label} left. Please lower the quantity.` : `${label} is sold out.`
        );
      }
      // The item's total is the sum of its colors.
      await connection.query(
        `UPDATE ${table} SET ${column} = ${column} - LEAST(${column}, ?) WHERE id = ?`,
        [need.quantity, need.id]
      );
      continue;
    }
    const [result] = await connection.query<ResultSetHeader>(
      `UPDATE ${table} SET ${column} = ${column} - ? WHERE id = ? AND ${column} >= ?`,
      [need.quantity, need.id, need.quantity]
    );
    if (result.affectedRows === 0) {
      const [[row]] = await connection.query<StockLeftRow[]>(`SELECT ${column} AS stock FROM ${table} WHERE id = ?`, [need.id]);
      const left = row?.stock ?? 0;
      throw new HttpError(
        409,
        left > 0 ? `Only ${left} ${need.unit} of ${need.name} left. Please lower the quantity.` : `${need.name} is sold out.`
      );
    }
  }

  if (sorted.length > 0) {
    await connection.query(
      "INSERT INTO order_stock (order_id, inventory_item_id, product_id, color_name, quantity) VALUES ?",
      [sorted.map((need) => [
        orderId, need.source === "inventory" ? need.id : null, need.source === "product" ? need.id : null, need.color ?? null, need.quantity
      ])]
    );
  }
};

export interface CancelConditions {
  /** Statuses the order may be in; Completed orders can never be cancelled. */
  statuses?: Array<"Pending" | "Ready">;
  userId?: string;
  paymentStatus?: string;
}

// Marks the order Cancelled and puts back everything it took. The status change and the return happen in the
// caller's transaction, and the conditional UPDATE means stock is only ever returned once.
export const cancelOrderWith = async (
  connection: PoolConnection,
  orderId: string,
  reason: string,
  { statuses = ["Pending", "Ready"], userId, paymentStatus }: CancelConditions = {}
) => {
  const [result] = await connection.query<ResultSetHeader>(
    `UPDATE orders SET status = 'Cancelled', cancelled_at = CURRENT_TIMESTAMP, cancel_reason = ?
     WHERE id = ? AND status IN (?)${userId ? " AND user_id = ?" : ""}${paymentStatus ? " AND payment_status = ?" : ""}`,
    [reason, orderId, statuses, ...(userId ? [userId] : []), ...(paymentStatus ? [paymentStatus] : [])]
  );
  if (result.affectedRows === 0) {
    return false;
  }
  for (const { table, column, ledgerColumn } of Object.values(STOCK_TABLES)) {
    await connection.query(
      `UPDATE ${table} t
       JOIN (SELECT ${ledgerColumn} AS item_id, SUM(quantity) AS quantity FROM order_stock
             WHERE order_id = ? AND ${ledgerColumn} IS NOT NULL GROUP BY ${ledgerColumn}) s ON s.item_id = t.id
       SET t.${column} = t.${column} + s.quantity`,
      [orderId]
    );
  }
  await connection.query(
    `UPDATE inventory_color_stock c
     JOIN (SELECT inventory_item_id AS item_id, color_name, SUM(quantity) AS quantity FROM order_stock
           WHERE order_id = ? AND inventory_item_id IS NOT NULL AND color_name IS NOT NULL
           GROUP BY inventory_item_id, color_name) s ON s.item_id = c.inventory_item_id AND s.color_name = c.color_name
     SET c.current_stock = c.current_stock + s.quantity`,
    [orderId]
  );
  return true;
};

// Keeps an item's per-color rows in line with the colors its flower has now: new colors start at 0, removed colors
// drop out, and the item's total becomes the sum of what is left. A flower with no colors isn't tracked per color.
export const syncColorStock = async (executor: Pick<PoolConnection, "query">, inventoryItemId: string, colorNames: string[]) => {
  if (colorNames.length === 0) {
    await executor.query("DELETE FROM inventory_color_stock WHERE inventory_item_id = ?", [inventoryItemId]);
    return;
  }
  await executor.query(
    "INSERT IGNORE INTO inventory_color_stock (inventory_item_id, color_name, current_stock) VALUES ?",
    [colorNames.map((name) => [inventoryItemId, name, 0])]
  );
  await executor.query("DELETE FROM inventory_color_stock WHERE inventory_item_id = ? AND color_name NOT IN (?)", [inventoryItemId, colorNames]);
  await executor.query(
    `UPDATE inventory_items
     SET current_stock = (SELECT COALESCE(SUM(current_stock), 0) FROM inventory_color_stock WHERE inventory_item_id = ?)
     WHERE id = ?`,
    [inventoryItemId, inventoryItemId]
  );
};

export const withTransaction = async <T>(work: (connection: PoolConnection) => Promise<T>) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const cancelOrder = (orderId: string, reason: string, conditions?: CancelConditions) =>
  withTransaction((connection) => cancelOrderWith(connection, orderId, reason, conditions));

interface OrderIdRow extends RowDataPacket {
  id: string;
}

// Orders still waiting for the customer's payment screenshot after `hours` are cancelled so their stock goes back.
export const cancelUnpaidOrders = async (hours: number) => {
  const [rows] = await pool.query<OrderIdRow[]>(
    `SELECT id FROM orders
     WHERE status = 'Pending' AND payment_status = 'Awaiting payment' AND created_at < CURRENT_TIMESTAMP - INTERVAL ? HOUR`,
    [hours]
  );
  let cancelled = 0;
  for (const { id } of rows) {
    const done = await cancelOrder(id, `Cancelled automatically: no payment was sent within ${hours} hours.`, {
      statuses: ["Pending"],
      paymentStatus: "Awaiting payment"
    });
    cancelled += done ? 1 : 0;
  }
  return cancelled;
};
