import type { RowDataPacket } from "mysql2";
import { pool } from "./pool.js";

export const PAYMENT_METHOD_KINDS = ["Bank", "E-wallet"] as const;

export interface PaymentMethodRow extends RowDataPacket {
  id: string;
  kind: (typeof PAYMENT_METHOD_KINDS)[number];
  provider: string;
  account_name: string;
  account_number: string;
  qr_image_url: string | null;
  is_active: number;
}

const PAYMENT_METHOD_SELECT =
  "SELECT id, kind, provider, account_name, account_number, qr_image_url, is_active FROM payment_methods";

// Shape matches PaymentMethod in frontend/src/types/shop.ts. qrImageUrl is a Cloudinary URL.
export const toPaymentMethod = (row: PaymentMethodRow) => ({
  id: row.id,
  kind: row.kind,
  provider: row.provider,
  accountName: row.account_name,
  accountNumber: row.account_number,
  qrImageUrl: row.qr_image_url,
  active: Boolean(row.is_active)
});

// Active methods only for checkout; the admin page also sees hidden ones.
export const loadPaymentMethods = async (activeOnly: boolean) => {
  const [rows] = await pool.query<PaymentMethodRow[]>(
    `${PAYMENT_METHOD_SELECT} ${activeOnly ? "WHERE is_active = TRUE" : ""} ORDER BY sort_order, created_at`
  );
  return rows.map(toPaymentMethod);
};

export const findPaymentMethod = async (id: string) => {
  const [rows] = await pool.query<PaymentMethodRow[]>(`${PAYMENT_METHOD_SELECT} WHERE id = ?`, [id]);
  return rows[0] ? toPaymentMethod(rows[0]) : null;
};
