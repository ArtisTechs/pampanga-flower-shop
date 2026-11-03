import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../../db/pool.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { withTransaction } from "../../db/stock.js";
import { bodyOf, requireId, requireInt, requireString } from "../../utils/validate.js";

interface InventoryRow extends RowDataPacket {
  id: string;
  kind: "flower" | "add-on" | "product";
  name: string;
  description: string;
  threshold: number;
  current_stock: number;
  capacity: number;
  unit: string;
}

interface ColorRow extends RowDataPacket {
  inventory_item_id: string;
  color_name: string;
  current_stock: number;
  hex: string | null;
}

interface InventoryColor {
  name: string;
  hex: string | null;
  inStock: number;
}

const INVENTORY_SELECT =
  "SELECT id, kind, name, description, threshold, current_stock, capacity, unit FROM inventory_items";

// Ready-made bouquets are listed with the supplies. They have no storage limit: "capacity" only scales the
// level bar, and they count as low at PRODUCT_LOW_STOCK or fewer.
const PRODUCT_LOW_STOCK = 5;
const PRODUCT_BAR_SCALE = 50;
const MAX_PRODUCT_STOCK = 100_000;
const PRODUCT_INVENTORY_SELECT = `
  SELECT p.id, 'product' AS kind, p.name,
         CONCAT(c.title, IF(p.is_active, '', ' · hidden from the shop')) AS description,
         ${PRODUCT_LOW_STOCK} AS threshold, p.stock AS current_stock, GREATEST(p.stock, ${PRODUCT_BAR_SCALE}) AS capacity,
         'bouquets' AS unit
  FROM products p
  JOIN categories c ON c.id = p.category_id`;

// Flowers customers can pick in several colors keep a count per color (in the order the flower lists them);
// the item's own count is their total.
const loadColors = async (itemIds: string[]) => {
  const colors = new Map<string, InventoryColor[]>();
  if (itemIds.length === 0) {
    return colors;
  }
  const [rows] = await pool.query<ColorRow[]>(
    `SELECT s.inventory_item_id, s.color_name, s.current_stock,
            JSON_UNQUOTE(JSON_EXTRACT(b.color_choices, CONCAT('$[', j.idx - 1, '].hex'))) AS hex
     FROM inventory_color_stock s
     JOIN inventory_items i ON i.id = s.inventory_item_id
     LEFT JOIN builder_options b ON b.id = i.builder_option_id
     LEFT JOIN JSON_TABLE(b.color_choices, '$[*]' COLUMNS (idx FOR ORDINALITY, name VARCHAR(64) PATH '$.name')) j
            ON j.name COLLATE utf8mb4_general_ci = s.color_name
     WHERE s.inventory_item_id IN (?)
     ORDER BY s.inventory_item_id, j.idx, s.color_name`,
    [itemIds]
  );
  for (const row of rows) {
    colors.set(row.inventory_item_id, [...(colors.get(row.inventory_item_id) ?? []), { name: row.color_name, hex: row.hex, inStock: row.current_stock }]);
  }
  return colors;
};

// Shape matches InventoryItem in frontend/src/types/shop.ts.
const toInventoryItem = (row: InventoryRow, colors?: InventoryColor[]) => ({
  id: row.id,
  kind: row.kind,
  name: row.name,
  description: row.description,
  threshold: row.threshold,
  inStock: row.current_stock,
  capacity: row.capacity,
  unit: row.unit,
  ...(colors && colors.length > 0 ? { colors } : {})
});

export const adminInventoryRouter = Router();

adminInventoryRouter.get("/inventory", async (_req, res) => {
  const [[rows], [productRows]] = await Promise.all([
    pool.query<InventoryRow[]>(`${INVENTORY_SELECT} ORDER BY kind, sort_order, name`),
    pool.query<InventoryRow[]>(`${PRODUCT_INVENTORY_SELECT} ORDER BY c.sort_order, p.sort_order, p.name`)
  ]);
  const colors = await loadColors(rows.map((row) => row.id));
  res.json([...rows.map((row) => toInventoryItem(row, colors.get(row.id))), ...productRows.map((row) => toInventoryItem(row))]);
});

// Same as below for a ready-made bouquet; the result is clamped to 0..MAX_PRODUCT_STOCK.
adminInventoryRouter.post("/inventory/products/:id/adjust", async (req, res) => {
  const id = requireId(req.params.id, "product");
  const delta = requireInt(bodyOf(req).delta, "delta", -1000, 1000);
  const [result] = await pool.query<ResultSetHeader>(
    "UPDATE products SET stock = LEAST(?, GREATEST(0, CAST(stock AS SIGNED) + ?)) WHERE id = ?",
    [MAX_PRODUCT_STOCK, delta, id]
  );
  if (result.affectedRows === 0) {
    throw new HttpError(404, "Product not found");
  }
  const [rows] = await pool.query<InventoryRow[]>(`${PRODUCT_INVENTORY_SELECT} WHERE p.id = ?`, [id]);
  res.json(toInventoryItem(rows[0]));
});

const MAX_CAPACITY = 100_000;

// Body: { capacity, threshold } - the most the shop stores of this supply (the level bar's end) and the stock at or
// below which it counts as low. Capacity can't go under what is in stock now.
adminInventoryRouter.patch("/inventory/:id", async (req, res) => {
  const id = requireId(req.params.id, "inventory item");
  const body = bodyOf(req);
  const capacity = requireInt(body.capacity, "Maximum stock", 1, MAX_CAPACITY);
  const threshold = requireInt(body.threshold, "Restock level", 0, capacity);
  const [[item]] = await pool.query<RowDataPacket[]>("SELECT current_stock FROM inventory_items WHERE id = ?", [id]);
  if (!item) {
    throw new HttpError(404, "Inventory item not found");
  }
  if (capacity < Number(item.current_stock)) {
    throw new HttpError(400, `Maximum stock can't be below the ${item.current_stock} currently in stock`);
  }
  await pool.query("UPDATE inventory_items SET capacity = ?, threshold = ? WHERE id = ?", [capacity, threshold, id]);
  const [rows] = await pool.query<InventoryRow[]>(`${INVENTORY_SELECT} WHERE id = ?`, [id]);
  res.json(toInventoryItem(rows[0], (await loadColors([id])).get(id)));
});

// Adds or removes stock; the result is clamped to 0..capacity in a single atomic UPDATE. A flower counted per
// color needs a body.color: only that color changes, and the flower's total follows (capped at capacity).
adminInventoryRouter.post("/inventory/:id/adjust", async (req, res) => {
  const id = requireId(req.params.id, "inventory item");
  const body = bodyOf(req);
  const delta = requireInt(body.delta, "delta", -1000, 1000);
  const [colorCount] = await pool.query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM inventory_color_stock WHERE inventory_item_id = ?",
    [id]
  );

  if (Number(colorCount[0].total) > 0) {
    const color = requireString(body.color, "color", 64);
    await withTransaction(async (connection) => {
      const [[item]] = await connection.query<RowDataPacket[]>("SELECT capacity FROM inventory_items WHERE id = ? FOR UPDATE", [id]);
      const [[current]] = await connection.query<RowDataPacket[]>(
        "SELECT current_stock FROM inventory_color_stock WHERE inventory_item_id = ? AND color_name = ? FOR UPDATE",
        [id, color]
      );
      if (!item || !current) {
        throw new HttpError(404, "Inventory item or color not found");
      }
      const [[sum]] = await connection.query<RowDataPacket[]>(
        "SELECT SUM(current_stock) AS total FROM inventory_color_stock WHERE inventory_item_id = ?",
        [id]
      );
      const room = Math.max(0, Number(item.capacity) - Number(sum.total));
      const next = Math.min(Number(current.current_stock) + room, Math.max(0, Number(current.current_stock) + delta));
      await connection.query(
        "UPDATE inventory_color_stock SET current_stock = ? WHERE inventory_item_id = ? AND color_name = ?",
        [next, id, color]
      );
      await connection.query(
        `UPDATE inventory_items
         SET current_stock = (SELECT SUM(current_stock) FROM inventory_color_stock WHERE inventory_item_id = ?)
         WHERE id = ?`,
        [id, id]
      );
    });
  } else {
    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE inventory_items
       SET current_stock = LEAST(capacity, GREATEST(0, CAST(current_stock AS SIGNED) + ?))
       WHERE id = ?`,
      [delta, id]
    );
    if (result.affectedRows === 0) {
      throw new HttpError(404, "Inventory item not found");
    }
  }
  const [rows] = await pool.query<InventoryRow[]>(`${INVENTORY_SELECT} WHERE id = ?`, [id]);
  if (rows.length === 0) {
    throw new HttpError(404, "Inventory item not found");
  }
  res.json(toInventoryItem(rows[0], (await loadColors([id])).get(id)));
});
