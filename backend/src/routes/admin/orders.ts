import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { loadOrderItems } from "../../db/orders.js";
import { pool } from "../../db/pool.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { bodyOf, requireId, requireOneOf, requireString } from "../../utils/validate.js";

export const ORDER_STATUSES = ["Pending", "Ready", "Completed"] as const;
export const PAYMENT_STATUSES = ["Pay on pick-up", "Awaiting payment", "For verification", "Verified", "Rejected"] as const;
// Payment states that let the shop start preparing an order.
const SETTLED_PAYMENT_STATUSES: readonly string[] = ["Pay on pick-up", "Verified"];
const PAYMENT_DECISIONS = ["Verified", "Rejected"] as const;

export interface OrderRow extends RowDataPacket {
  id: string;
  customer_name: string;
  contact_number: string;
  bouquet_size: string | null;
  pickup_at: Date;
  total_php: number;
  status: (typeof ORDER_STATUSES)[number];
  payment_status: (typeof PAYMENT_STATUSES)[number];
}

export const ORDER_SELECT =
  "SELECT id, customer_name, contact_number, bouquet_size, pickup_at, total_php, status, payment_status FROM orders";

// Shape matches AdminOrder in frontend/src/types/shop.ts.
export const toAdminOrder = (row: OrderRow) => ({
  id: row.id,
  customerName: row.customer_name,
  contactNumber: row.contact_number,
  bouquetSize: row.bouquet_size,
  pickupAt: row.pickup_at.toISOString(),
  totalPhp: row.total_php,
  status: row.status,
  paymentStatus: row.payment_status
});

const findAdminOrder = async (id: string) => {
  const [rows] = await pool.query<OrderRow[]>(`${ORDER_SELECT} WHERE id = ?`, [id]);
  if (rows.length === 0) {
    throw new HttpError(404, "Order not found");
  }
  return rows[0];
};

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
  payment_provider: string | null;
  payment_account_name: string | null;
  payment_account_number: string | null;
  payment_proof_url: string | null;
  payment_submitted_at: Date | null;
  payment_reviewed_at: Date | null;
  payment_note: string | null;
}

// What the shop needs to prepare: every item with its bouquet details and flower counts, plus the payment to check.
adminOrdersRouter.get("/orders/:id", async (req, res) => {
  const id = requireId(req.params.id, "order");
  const [orders] = await pool.query<OrderDetailRow[]>(
    `SELECT o.id, o.customer_name, o.contact_number, o.bouquet_size, o.pickup_at, o.total_php, o.status,
            o.payment_status, o.payment_provider, o.payment_account_name, o.payment_account_number,
            o.payment_proof_url, o.payment_submitted_at, o.payment_reviewed_at, o.payment_note,
            o.created_at, u.email AS customer_email
     FROM orders o
     LEFT JOIN users u ON u.id = o.user_id
     WHERE o.id = ?`,
    [id]
  );
  if (orders.length === 0) {
    throw new HttpError(404, "Order not found");
  }

  const order = orders[0];
  res.json({
    ...toAdminOrder(order),
    createdAt: order.created_at.toISOString(),
    customerEmail: order.customer_email,
    payment: {
      provider: order.payment_provider,
      accountName: order.payment_account_name,
      accountNumber: order.payment_account_number,
      proofUrl: order.payment_proof_url,
      submittedAt: order.payment_submitted_at?.toISOString() ?? null,
      reviewedAt: order.payment_reviewed_at?.toISOString() ?? null,
      note: order.payment_note
    },
    items: await loadOrderItems(id)
  });
});

adminOrdersRouter.patch("/orders/:id", async (req, res) => {
  const id = requireId(req.params.id, "order");
  const status = requireOneOf(bodyOf(req).status, "status", ORDER_STATUSES);
  const order = await findAdminOrder(id);
  if (status !== "Pending" && !SETTLED_PAYMENT_STATUSES.includes(order.payment_status)) {
    throw new HttpError(409, "Verify the customer's payment before preparing this order");
  }
  await pool.query("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
  res.json(toAdminOrder(await findAdminOrder(id)));
});

// Body: { decision: "Verified" | "Rejected", note? } — a note is required when rejecting (the customer sees it).
adminOrdersRouter.patch("/orders/:id/payment", async (req, res) => {
  const id = requireId(req.params.id, "order");
  const body = bodyOf(req);
  const decision = requireOneOf(body.decision, "decision", PAYMENT_DECISIONS);
  const note = decision === "Rejected"
    ? requireString(body.note, "Reason for rejecting", 500)
    : null;

  // Only a submitted screenshot can be reviewed; the condition also guards against two admins deciding at once.
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE orders SET payment_status = ?, payment_note = ?, payment_reviewed_at = CURRENT_TIMESTAMP
     WHERE id = ? AND payment_status = 'For verification'`,
    [decision, note, id]
  );
  if (result.affectedRows === 0) {
    await findAdminOrder(id);
    throw new HttpError(409, "This payment is not waiting for verification");
  }
  res.json(toAdminOrder(await findAdminOrder(id)));
});
