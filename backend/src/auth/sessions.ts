import { createHash, randomBytes } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../db/pool.js";

const SESSION_TTL_DAYS = 7;

export type AccountRole = "user" | "admin";

export interface AuthUser {
  id: string;
  role: AccountRole;
  fullName: string;
  email: string;
  contactNumber: string;
}

interface SessionUserRow extends RowDataPacket {
  id: string;
  role: AccountRole;
  full_name: string;
  email: string;
  contact_number: string | null;
}

// Only the SHA-256 of a token is stored, so a leaked sessions table can't be replayed.
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const createSession = async (userId: string) => {
  const token = randomBytes(32).toString("base64url");
  await pool.query("DELETE FROM sessions WHERE expires_at < UTC_TIMESTAMP()");
  await pool.query(
    "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, UTC_TIMESTAMP() + INTERVAL ? DAY)",
    [hashToken(token), userId, SESSION_TTL_DAYS]
  );
  return token;
};

export const deleteSession = async (token: string) => {
  await pool.query<ResultSetHeader>("DELETE FROM sessions WHERE token_hash = ?", [hashToken(token)]);
};

export const deleteUserSessions = async (userId: string) => {
  await pool.query<ResultSetHeader>("DELETE FROM sessions WHERE user_id = ?", [userId]);
};

export const findSessionUser = async (token: string): Promise<AuthUser | null> => {
  const [rows] = await pool.query<SessionUserRow[]>(
    `SELECT u.id, u.role, u.full_name, u.email, u.contact_number
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP() AND u.status = 'Active'`,
    [hashToken(token)]
  );
  const row = rows[0];
  return row
    ? { id: row.id, role: row.role, fullName: row.full_name, email: row.email, contactNumber: row.contact_number ?? "" }
    : null;
};

const initialsFrom = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

// Shape matches Account in frontend/src/types/shop.ts.
export const toAccount = (user: AuthUser) => ({ ...user, avatarInitials: initialsFrom(user.fullName) });
