import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { deleteUserSessions } from "../../auth/sessions.js";
import { pool } from "../../db/pool.js";
import { HttpError } from "../../middleware/errorHandler.js";
import {
  bodyOf,
  isDuplicateEntry,
  requireContactNumber,
  requireEmail,
  requireId,
  requireOneOf,
  requireString
} from "../../utils/validate.js";

const USER_STATUSES = ["Active", "Disabled"] as const;
const USER_TIERS = ["Customer", "VIP"] as const;

interface CustomerRow extends RowDataPacket {
  id: string;
  full_name: string;
  email: string;
  contact_number: string | null;
  status: (typeof USER_STATUSES)[number];
  tier: (typeof USER_TIERS)[number];
}

const CUSTOMER_SELECT = "SELECT id, full_name, email, contact_number, status, tier FROM users WHERE role = 'user'";

// Shape matches AdminUser in frontend/src/types/shop.ts.
const toAdminUser = (row: CustomerRow) => ({
  id: row.id,
  fullName: row.full_name,
  email: row.email,
  contactNumber: row.contact_number ?? "",
  status: row.status,
  role: row.tier
});

export const adminUsersRouter = Router();

// Customer accounts only; admin accounts are not editable here.
adminUsersRouter.get("/users", async (_req, res) => {
  const [rows] = await pool.query<CustomerRow[]>(`${CUSTOMER_SELECT} ORDER BY created_at, full_name`);
  res.json(rows.map(toAdminUser));
});

adminUsersRouter.patch("/users/:id", async (req, res) => {
  const id = requireId(req.params.id, "user");
  const body = bodyOf(req);
  const fullName = requireString(body.fullName, "Full name", 120);
  const email = requireEmail(body.email);
  const contactNumber = requireContactNumber(body.contactNumber);
  const status = requireOneOf(body.status, "status", USER_STATUSES);
  const tier = requireOneOf(body.role, "role", USER_TIERS);

  let result: ResultSetHeader;
  try {
    [result] = await pool.query<ResultSetHeader>(
      `UPDATE users SET full_name = ?, email = ?, contact_number = ?, status = ?, tier = ?
       WHERE id = ? AND role = 'user'`,
      [fullName, email, contactNumber, status, tier, id]
    );
  } catch (error) {
    if (isDuplicateEntry(error)) {
      throw new HttpError(409, "Another account already uses this email");
    }
    throw error;
  }
  if (result.affectedRows === 0) {
    throw new HttpError(404, "User not found");
  }
  if (status === "Disabled") {
    await deleteUserSessions(id);
  }

  const [rows] = await pool.query<CustomerRow[]>(`${CUSTOMER_SELECT} AND id = ?`, [id]);
  res.json(toAdminUser(rows[0]));
});
