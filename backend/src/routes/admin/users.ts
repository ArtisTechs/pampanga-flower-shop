import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { hashPassword } from "../../auth/password.js";
import { deleteUserSessions, joinName } from "../../auth/sessions.js";
import { pool } from "../../db/pool.js";
import { currentUser } from "../../middleware/auth.js";
import { HttpError } from "../../middleware/errorHandler.js";
import {
  bodyOf,
  forField,
  isDuplicateEntry,
  requireContactNumber,
  requireEmail,
  requireId,
  requireName,
  requireNewPassword,
  requireOneOf
} from "../../utils/validate.js";

const USER_STATUSES = ["Active", "Disabled"] as const;
const USER_TIERS = ["Customer", "VIP"] as const;
const ACCOUNT_ROLES = ["user", "admin"] as const;
const EMAIL_TAKEN = "Another account already uses this email";

interface UserAccountRow extends RowDataPacket {
  id: string;
  role: (typeof ACCOUNT_ROLES)[number];
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  contact_number: string | null;
  avatar_url: string | null;
  status: (typeof USER_STATUSES)[number];
  tier: (typeof USER_TIERS)[number];
}

const USER_SELECT = "SELECT id, role, first_name, last_name, full_name, email, contact_number, avatar_url, status, tier FROM users";

// Shape matches AdminUser in frontend/src/types/shop.ts.
const toAdminUser = (row: UserAccountRow) => ({
  id: row.id,
  accountRole: row.role,
  firstName: row.first_name,
  lastName: row.last_name,
  fullName: row.full_name,
  email: row.email,
  contactNumber: row.contact_number ?? "",
  avatarUrl: row.avatar_url,
  status: row.status,
  role: row.tier
});

const findAdminUser = async (id: string) => {
  const [rows] = await pool.query<UserAccountRow[]>(`${USER_SELECT} WHERE id = ?`, [id]);
  return rows[0] ? toAdminUser(rows[0]) : null;
};

// Fields shared by create and update. Admins have no customer tier.
const readAccountFields = (body: Record<string, unknown>) => {
  const firstName = forField("firstName", () => requireName(body.firstName, "First name"));
  const lastName = forField("lastName", () => requireName(body.lastName, "Last name"));
  const email = forField("email", () => requireEmail(body.email));
  const contactNumber = forField("contactNumber", () => requireContactNumber(body.contactNumber));
  const accountRole = requireOneOf(body.accountRole, "accountRole", ACCOUNT_ROLES);
  const tier = accountRole === "admin" ? "Customer" : requireOneOf(body.role, "role", USER_TIERS);
  return { firstName, lastName, email, contactNumber, accountRole, tier };
};

export const adminUsersRouter = Router();

// Customers and admins; admins first.
adminUsersRouter.get("/users", async (_req, res) => {
  const [rows] = await pool.query<UserAccountRow[]>(`${USER_SELECT} ORDER BY role = 'admin' DESC, created_at, full_name`);
  res.json(rows.map(toAdminUser));
});

// The admin sets the starting password; the new user can change it later in their profile.
adminUsersRouter.post("/users", async (req, res) => {
  const body = bodyOf(req);
  const { firstName, lastName, email, contactNumber, accountRole, tier } = readAccountFields(body);
  const password = forField("password", () => requireNewPassword(body.password));
  const id = randomUUID();

  try {
    await pool.query(
      `INSERT INTO users (id, role, first_name, last_name, full_name, email, password_hash, contact_number, status, tier)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active', ?)`,
      [id, accountRole, firstName, lastName, joinName(firstName, lastName), email, await hashPassword(password), contactNumber, tier]
    );
  } catch (error) {
    if (isDuplicateEntry(error)) {
      throw new HttpError(409, EMAIL_TAKEN, "email");
    }
    throw error;
  }

  res.status(201).json(await findAdminUser(id));
});

adminUsersRouter.patch("/users/:id", async (req, res) => {
  const id = requireId(req.params.id, "user");
  const body = bodyOf(req);
  const { firstName, lastName, email, contactNumber, accountRole, tier } = readAccountFields(body);
  const status = requireOneOf(body.status, "status", USER_STATUSES);

  const existing = await findAdminUser(id);
  if (!existing) {
    throw new HttpError(404, "User not found");
  }
  const losesAdminAccess = existing.accountRole === "admin" && (accountRole !== "admin" || status !== "Active");
  if (losesAdminAccess && id === currentUser(res).id) {
    throw new HttpError(400, "You can't disable your own account or remove your own admin access");
  }
  if (losesAdminAccess) {
    const [[others]] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM users WHERE role = 'admin' AND status = 'Active' AND id <> ?",
      [id]
    );
    if (Number(others?.count ?? 0) === 0) {
      throw new HttpError(400, "At least one active admin account is required");
    }
  }

  let result: ResultSetHeader;
  try {
    [result] = await pool.query<ResultSetHeader>(
      `UPDATE users SET role = ?, first_name = ?, last_name = ?, full_name = ?, email = ?, contact_number = ?, status = ?, tier = ?
       WHERE id = ?`,
      [accountRole, firstName, lastName, joinName(firstName, lastName), email, contactNumber, status, tier, id]
    );
  } catch (error) {
    if (isDuplicateEntry(error)) {
      throw new HttpError(409, EMAIL_TAKEN, "email");
    }
    throw error;
  }
  if (result.affectedRows === 0) {
    throw new HttpError(404, "User not found");
  }
  // Signed-out accounts pick up a new role or status on their next login.
  if (status === "Disabled" || accountRole !== existing.accountRole) {
    await deleteUserSessions(id);
  }

  res.json(await findAdminUser(id));
});
