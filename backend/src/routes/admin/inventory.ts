import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../../db/pool.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { bodyOf, requireId, requireInt } from "../../utils/validate.js";

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

// Shape matches InventoryItem in frontend/src/types/shop.ts.
const toInventoryItem = (row: InventoryRow) => ({
  id: row.id,
  kind: row.kind,
  name: row.name,
  description: row.description,
  threshold: row.threshold,
  inStock: row.current_stock,
  capacity: row.capacity,
  unit: row.unit
});

export const adminInventoryRouter = Router();

adminInventoryRouter.get("/inventory", async (_req, res) => {
  const [[rows], [productRows]] = await Promise.all([
    pool.query<InventoryRow[]>(`${INVENTORY_SELECT} ORDER BY kind, sort_order, name`),
    pool.query<InventoryRow[]>(`${PRODUCT_INVENTORY_SELECT} ORDER BY c.sort_order, p.sort_order, p.name`)
  ]);
  res.json([...rows, ...productRows].map(toInventoryItem));
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

// Adds or removes stock; the result is clamped to 0..capacity in a single atomic UPDATE.
adminInventoryRouter.post("/inventory/:id/adjust", async (req, res) => {
  const id = requireId(req.params.id, "inventory item");
  const delta = requireInt(bodyOf(req).delta, "delta", -1000, 1000);
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE inventory_items
     SET current_stock = LEAST(capacity, GREATEST(0, CAST(current_stock AS SIGNED) + ?))
     WHERE id = ?`,
    [delta, id]
  );
  if (result.affectedRows === 0) {
    throw new HttpError(404, "Inventory item not found");
  }
  const [rows] = await pool.query<InventoryRow[]>(`${INVENTORY_SELECT} WHERE id = ?`, [id]);
  res.json(toInventoryItem(rows[0]));
});
