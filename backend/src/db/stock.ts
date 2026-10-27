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
    const key = `${need.source}:${need.id}`;
    const existing = merged.get(key);
    merged.set(key, existing ? { ...existing, quantity: existing.quantity + need.quantity } : { ...need });
  }

  const sorted = [...merged.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, need]) => need);
  for (const need of sorted) {
    const { table, column } = STOCK_TABLES[need.source];
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
      "INSERT INTO order_stock (order_id, inventory_item_id, product_id, quantity) VALUES ?",
      [sorted.map((need) => [orderId, need.source === "inventory" ? need.id : null, need.source === "product" ? need.id : null, need.quantity])]
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
  return true;
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
