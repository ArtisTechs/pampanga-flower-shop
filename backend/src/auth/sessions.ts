import { createHash, randomBytes } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { pool } from "../db/pool.js";

const SESSION_TTL_DAYS = 7;

export type AccountRole = "user" | "admin";

export interface AuthUser {
  id: string;
  role: AccountRole;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  contactNumber: string;
  avatarUrl: string | null;
}

export interface UserRow extends RowDataPacket {
  id: string;
  role: AccountRole;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  contact_number: string | null;
  avatar_url: string | null;
}

// Columns for toAuthUser; prefix with a table alias where needed.
export const USER_COLUMNS = ["id", "role", "first_name", "last_name", "full_name", "email", "contact_number", "avatar_url"];

// full_name is the stored display name; it must be written alongside first_name/last_name.
export const joinName = (firstName: string, lastName: string) => [firstName, lastName].filter(Boolean).join(" ");

export const toAuthUser = (row: UserRow): AuthUser => ({
  id: row.id,
  role: row.role,
  firstName: row.first_name,
  lastName: row.last_name,
  fullName: row.full_name,
  email: row.email,
  contactNumber: row.contact_number ?? "",
  avatarUrl: row.avatar_url
});

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

// Signs out every other device, keeping the session that made the request.
export const deleteOtherSessions = async (userId: string, keepToken: string) => {
  await pool.query<ResultSetHeader>(
    "DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?",
    [userId, hashToken(keepToken)]
  );
};

export const findSessionUser = async (token: string): Promise<AuthUser | null> => {
  const [rows] = await pool.query<UserRow[]>(
    `SELECT ${USER_COLUMNS.map((column) => `u.${column}`).join(", ")}
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > UTC_TIMESTAMP() AND u.status = 'Active'`,
    [hashToken(token)]
  );
  return rows[0] ? toAuthUser(rows[0]) : null;
};

// First letter of the first and last names ("Ana Mae Dela Cruz" -> "AD").
const initialsOf = (user: AuthUser) =>
  [user.firstName, user.lastName]
    .map((name) => name.trim()[0]?.toUpperCase() ?? "")
    .join("");

// Shape matches Account in frontend/src/types/shop.ts.
export const toAccount = (user: AuthUser) => ({ ...user, avatarInitials: initialsOf(user) });

export const findUserById = async (userId: string) => {
  const [rows] = await pool.query<UserRow[]>(`SELECT ${USER_COLUMNS.join(", ")} FROM users WHERE id = ?`, [userId]);
  return rows[0] ? toAuthUser(rows[0]) : null;
};
