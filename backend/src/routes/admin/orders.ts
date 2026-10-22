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

interface OrderDetailRow extends OrderRow {
  created_at: Date;
  customer_email: string | null;
}

interface OrderItemRow extends RowDataPacket {
  id: number;
  product_name: string;
  unit_price_php: number;
  quantity: number;
  customization: { size: string; palette: string; wrap: string; ribbon: string } | null;
  image_path: string | null;
}

interface OrderItemFlowerRow extends RowDataPacket {
  order_item_id: number;
  flower_name: string;
  quantity: number;
}

// What the shop needs to prepare: every item with its bouquet details and flower counts.
adminOrdersRouter.get("/orders/:id", async (req, res) => {
  const id = requireId(req.params.id, "order");
  const [orders] = await pool.query<OrderDetailRow[]>(
    `SELECT o.id, o.customer_name, o.contact_number, o.bouquet_size, o.pickup_at, o.total_php, o.status,
            o.created_at, u.email AS customer_email
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     WHERE o.id = ?`,
    [id]
  );
  if (orders.length === 0) {
    throw new HttpError(404, "Order not found");
  }

  const [items] = await pool.query<OrderItemRow[]>(
    `SELECT oi.id, oi.product_name, oi.unit_price_php, oi.quantity, oi.customization, p.image_path
     FROM order_items oi
     LEFT JOIN products p ON p.id = oi.product_id
     WHERE oi.order_id = ?
     ORDER BY oi.id`,
    [id]
  );
  const [flowers] = items.length > 0
    ? await pool.query<OrderItemFlowerRow[]>(
        "SELECT order_item_id, flower_name, quantity FROM order_item_flowers WHERE order_item_id IN (?) ORDER BY flower_name",
        [items.map((item) => item.id)]
      )
    : [[] as OrderItemFlowerRow[]];

  const order = orders[0];
  res.json({
    ...toAdminOrder(order),
    createdAt: order.created_at.toISOString(),
    customerEmail: order.customer_email,
    items: items.map((item) => ({
      id: item.id,
      name: item.product_name,
      unitPricePhp: item.unit_price_php,
      quantity: item.quantity,
      image: item.image_path,
      customization: item.customization,
      flowers: flowers
        .filter((flower) => flower.order_item_id === item.id)
        .map((flower) => ({ name: flower.flower_name, quantity: flower.quantity }))
    }))
  });
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
