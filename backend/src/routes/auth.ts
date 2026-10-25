import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import { consumeOtp, issueOtp, type OtpPurpose } from "../auth/otp.js";
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from "../auth/password.js";
import {
  createSession,
  deleteSession,
  deleteUserSessions,
  joinName,
  toAccount,
  toAuthUser,
  USER_COLUMNS,
  type UserRow
} from "../auth/sessions.js";
import { pool } from "../db/pool.js";
import { bearerToken, currentUser, requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import {
  bodyOf,
  forField,
  isDuplicateEntry,
  requireContactNumber,
  requireEmail,
  requireName,
  requireNewPassword,
  requireOneOf,
  requireOtpCode,
  requireString
} from "../utils/validate.js";

interface LoginRow extends UserRow {
  password_hash: string;
  status: "Active" | "Disabled";
}

const LOGIN_SELECT = `SELECT ${USER_COLUMNS.join(", ")}, password_hash, status FROM users`;

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const body = bodyOf(req);
  const email = forField("email", () => requireEmail(body.email));
  const password = forField("password", () => requireString(body.password, "Password", 200));

  const [rows] = await pool.query<LoginRow[]>(
    `${LOGIN_SELECT} WHERE email = ?`,
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
    account: toAccount(toAuthUser(row))
  });
});

const OTP_PURPOSES = ["signup", "reset"] as const satisfies readonly OtpPurpose[];
const EMAIL_TAKEN = "An account with this email already exists";

const emailIsRegistered = async (email: string) => {
  const [rows] = await pool.query<RowDataPacket[]>("SELECT 1 FROM users WHERE email = ? LIMIT 1", [email]);
  return rows.length > 0;
};

// Emails a one-time code. For resets the reply is the same whether or not the account exists.
authRouter.post("/otp", async (req, res) => {
  const body = bodyOf(req);
  const email = forField("email", () => requireEmail(body.email));
  const purpose = requireOneOf(body.purpose, "Purpose", OTP_PURPOSES);

  if (purpose === "signup") {
    if (await emailIsRegistered(email)) {
      throw new HttpError(409, EMAIL_TAKEN, "email");
    }
    await issueOtp(email, purpose);
  } else {
    const [rows] = await pool.query<RowDataPacket[]>(
      "SELECT 1 FROM users WHERE email = ? AND status = 'Active' LIMIT 1",
      [email]
    );
    if (rows.length > 0) {
      await issueOtp(email, purpose);
    }
  }

  res.json({ message: "If the email can receive codes, one is on its way. It expires in 10 minutes." });
});

authRouter.post("/password/reset", async (req, res) => {
  const body = bodyOf(req);
  const email = forField("email", () => requireEmail(body.email));
  const code = forField("code", () => requireOtpCode(body.code));
  const password = forField("password", () => requireNewPassword(body.password));

  const [rows] = await pool.query<LoginRow[]>(
    `${LOGIN_SELECT} WHERE email = ? AND status = 'Active'`,
    [email]
  );
  const row = rows[0];
  if (!row) {
    throw new HttpError(400, "This code is invalid or has expired. Please request a new one.", "code");
  }
  await consumeOtp(email, "reset", code);

  await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [await hashPassword(password), row.id]);
  // Sign out every other device that knew the old password.
  await deleteUserSessions(row.id);

  const token = await createSession(row.id);
  res.json({
    token,
    account: toAccount(toAuthUser(row))
  });
});

authRouter.post("/register", async (req, res) => {
  const body = bodyOf(req);
  const firstName = forField("firstName", () => requireName(body.firstName, "First name"));
  const lastName = forField("lastName", () => requireName(body.lastName, "Last name"));
  const fullName = joinName(firstName, lastName);
  const email = forField("email", () => requireEmail(body.email));
  const password = forField("password", () => requireNewPassword(body.password));
  const contactNumber = forField("contactNumber", () => requireContactNumber(body.contactNumber));
  const code = forField("code", () => requireOtpCode(body.code));
  const id = randomUUID();

  // Checked before the code is used up, so a taken email doesn't burn it.
  if (await emailIsRegistered(email)) {
    throw new HttpError(409, EMAIL_TAKEN, "email");
  }
  await consumeOtp(email, "signup", code);

  try {
    await pool.query(
      `INSERT INTO users (id, role, first_name, last_name, full_name, email, password_hash, contact_number)
       VALUES (?, 'user', ?, ?, ?, ?, ?, ?)`,
      [id, firstName, lastName, fullName, email, await hashPassword(password), contactNumber]
    );
  } catch (error) {
    if (isDuplicateEntry(error)) {
      throw new HttpError(409, EMAIL_TAKEN, "email");
    }
    throw error;
  }

  const token = await createSession(id);
  res.status(201).json({ token, account: toAccount({ id, role: "user", firstName, lastName, fullName, email, contactNumber, avatarUrl: null }) });
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
