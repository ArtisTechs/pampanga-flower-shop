import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { deleteUserSessions, joinName } from "../../auth/sessions.js";
import { pool } from "../../db/pool.js";
import { HttpError } from "../../middleware/errorHandler.js";
import {
  bodyOf,
  forField,
  isDuplicateEntry,
  requireContactNumber,
  requireEmail,
  requireId,
  requireName,
  requireOneOf
} from "../../utils/validate.js";

const USER_STATUSES = ["Active", "Disabled"] as const;
const USER_TIERS = ["Customer", "VIP"] as const;

interface CustomerRow extends RowDataPacket {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  contact_number: string | null;
  avatar_url: string | null;
  status: (typeof USER_STATUSES)[number];
  tier: (typeof USER_TIERS)[number];
}

const CUSTOMER_SELECT = "SELECT id, first_name, last_name, full_name, email, contact_number, avatar_url, status, tier FROM users WHERE role = 'user'";

// Shape matches AdminUser in frontend/src/types/shop.ts.
const toAdminUser = (row: CustomerRow) => ({
  id: row.id,
  firstName: row.first_name,
  lastName: row.last_name,
  fullName: row.full_name,
  email: row.email,
  contactNumber: row.contact_number ?? "",
  avatarUrl: row.avatar_url,
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
  const firstName = forField("firstName", () => requireName(body.firstName, "First name"));
  const lastName = forField("lastName", () => requireName(body.lastName, "Last name"));
  const email = requireEmail(body.email);
  const contactNumber = requireContactNumber(body.contactNumber);
  const status = requireOneOf(body.status, "status", USER_STATUSES);
  const tier = requireOneOf(body.role, "role", USER_TIERS);

  let result: ResultSetHeader;
  try {
    [result] = await pool.query<ResultSetHeader>(
      `UPDATE users SET first_name = ?, last_name = ?, full_name = ?, email = ?, contact_number = ?, status = ?, tier = ?
       WHERE id = ? AND role = 'user'`,
      [firstName, lastName, joinName(firstName, lastName), email, contactNumber, status, tier, id]
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
