import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "../auth/password.js";
import { createSession, deleteSession, toAccount, type AccountRole } from "../auth/sessions.js";
import { pool } from "../db/pool.js";
import { bearerToken, currentUser, requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { bodyOf, isDuplicateEntry, requireContactNumber, requireEmail, requireString } from "../utils/validate.js";

interface LoginRow extends RowDataPacket {
  id: string;
  role: AccountRole;
  full_name: string;
  email: string;
  contact_number: string | null;
  password_hash: string;
  status: "Active" | "Disabled";
}

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const body = bodyOf(req);
  const email = requireEmail(body.email);
  const password = requireString(body.password, "Password", 200);

  const [rows] = await pool.query<LoginRow[]>(
    "SELECT id, role, full_name, email, contact_number, password_hash, status FROM users WHERE email = ?",
    [email]
  );
  const row = rows[0];
  const passwordMatches = await verifyPassword(password, row?.password_hash ?? DUMMY_PASSWORD_HASH);

  if (!row || !passwordMatches) {
    throw new HttpError(401, "Invalid email or password");
  }
  if (row.status !== "Active") {
    throw new HttpError(403, "This account has been disabled");
  }

  const token = await createSession(row.id);
  res.json({
    token,
    account: toAccount({
      id: row.id,
      role: row.role,
      fullName: row.full_name,
      email: row.email,
      contactNumber: row.contact_number ?? ""
    })
  });
});

authRouter.post("/register", async (req, res) => {
  const body = bodyOf(req);
  const fullName = requireString(body.fullName, "Full name", 120);
  const email = requireEmail(body.email);
  const password = requireString(body.password, "Password", 200, 6);
  const contactNumber = requireContactNumber(body.contactNumber);
  const id = randomUUID();

  try {
    await pool.query(
      "INSERT INTO users (id, role, full_name, email, password_hash, contact_number) VALUES (?, 'user', ?, ?, ?, ?)",
      [id, fullName, email, await hashPassword(password), contactNumber]
    );
  } catch (error) {
    if (isDuplicateEntry(error)) {
      throw new HttpError(409, "An account with this email already exists");
    }
    throw error;
  }

  const token = await createSession(id);
  res.status(201).json({ token, account: toAccount({ id, role: "user", fullName, email, contactNumber }) });
});

authRouter.get("/me", requireAuth, (_req, res) => {
  res.json({ account: toAccount(currentUser(res)) });
});

authRouter.post("/logout", async (req, res) => {
  const token = bearerToken(req);
  if (token) {
    await deleteSession(token);
  }
  res.status(204).end();
});
