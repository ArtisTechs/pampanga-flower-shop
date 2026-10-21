import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../../db/pool.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { bodyOf, requireId, requireInt } from "../../utils/validate.js";

interface InventoryRow extends RowDataPacket {
  id: string;
  kind: "flower" | "add-on";
  name: string;
  description: string;
  threshold: number;
  current_stock: number;
  capacity: number;
  unit: string;
}

const INVENTORY_SELECT =
  "SELECT id, kind, name, description, threshold, current_stock, capacity, unit FROM inventory_items";

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
  const [rows] = await pool.query<InventoryRow[]>(`${INVENTORY_SELECT} ORDER BY kind, sort_order, name`);
  res.json(rows.map(toInventoryItem));
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
