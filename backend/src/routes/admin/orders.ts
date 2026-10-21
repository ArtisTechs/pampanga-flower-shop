import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../../db/pool.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { bodyOf, requireId, requireOneOf } from "../../utils/validate.js";

export const ORDER_STATUSES = ["Pending", "Ready", "Completed"] as const;

export interface OrderRow extends RowDataPacket {
  id: string;
  customer_name: string;
  contact_number: string;
  bouquet_size: string | null;
  pickup_at: Date;
  total_php: number;
  status: (typeof ORDER_STATUSES)[number];
}

export const ORDER_SELECT =
  "SELECT id, customer_name, contact_number, bouquet_size, pickup_at, total_php, status FROM orders";

// Shape matches AdminOrder in frontend/src/types/shop.ts.
export const toAdminOrder = (row: OrderRow) => ({
  id: row.id,
  customerName: row.customer_name,
  contactNumber: row.contact_number,
  bouquetSize: row.bouquet_size,
  pickupAt: row.pickup_at.toISOString(),
  totalPhp: row.total_php,
  status: row.status
});

export const adminOrdersRouter = Router();

// GET /admin/orders?status=Pending|Ready|Completed
adminOrdersRouter.get("/orders", async (req, res) => {
  const status = req.query.status === undefined ? null : requireOneOf(req.query.status, "status", ORDER_STATUSES);
  const [rows] = await pool.query<OrderRow[]>(
    `${ORDER_SELECT} ${status ? "WHERE status = ?" : ""} ORDER BY pickup_at DESC, created_at DESC`,
    status ? [status] : []
  );
  res.json(rows.map(toAdminOrder));
});

adminOrdersRouter.patch("/orders/:id", async (req, res) => {
  const id = requireId(req.params.id, "order");
  const status = requireOneOf(bodyOf(req).status, "status", ORDER_STATUSES);
  const [result] = await pool.query<ResultSetHeader>("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
  if (result.affectedRows === 0) {
    throw new HttpError(404, "Order not found");
  }
  const [rows] = await pool.query<OrderRow[]>(`${ORDER_SELECT} WHERE id = ?`, [id]);
  res.json(toAdminOrder(rows[0]));
});
