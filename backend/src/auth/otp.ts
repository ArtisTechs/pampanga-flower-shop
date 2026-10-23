import { createHash, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { config } from "../config.js";
import { pool } from "../db/pool.js";
import { HttpError } from "../middleware/errorHandler.js";
import { isEmailConfigured, sendEmail } from "../services/email.js";

export type OtpPurpose = "signup" | "reset";

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const MAX_SENDS_PER_HOUR = 5;

interface OtpRow extends RowDataPacket {
  id: string;
  code_hash: string;
  attempts: number;
}

interface SendCountRow extends RowDataPacket {
  last_hour: number;
  last_minute: number | null;
}

// Bound to the email and purpose, so a code can't be replayed for another account or flow.
const hashCode = (email: string, purpose: OtpPurpose, code: string) =>
  createHash("sha256").update(`${purpose}:${email}:${code}`).digest("hex");

const EMAIL_COPY: Record<OtpPurpose, { subject: string; intro: string }> = {
  signup: { subject: "Your sign-up code", intro: "Use this code to finish creating your account:" },
  reset: { subject: "Your password reset code", intro: "Use this code to reset your password:" }
};

const sendCodeEmail = async (email: string, purpose: OtpPurpose, code: string) => {
  if (!isEmailConfigured() && config.nodeEnv !== "production") {
    console.info(`[dev] ${purpose} code for ${email}: ${code} (set BREVO_API_KEY to send real emails)`);
    return;
  }

  const { subject, intro } = EMAIL_COPY[purpose];
  const shopName = config.mail.fromName;
  const footer = `This code expires in ${CODE_TTL_MINUTES} minutes. If you didn't request it, you can ignore this email.`;
  await sendEmail({
    to: email,
    subject: `${subject}: ${code}`,
    text: `${intro}\n\n${code}\n\n${footer}\n\n${shopName}`,
    html: `<div style="font-family:Arial,sans-serif;color:#1d1518;max-width:480px">
      <h2 style="color:#f34a98;margin:0 0 12px">${shopName}</h2>
      <p>${intro}</p>
      <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:16px 0">${code}</p>
      <p style="color:#6f6466;font-size:13px">${footer}</p>
    </div>`
  });
};

export const issueOtp = async (email: string, purpose: OtpPurpose) => {
  const [[counts]] = await pool.query<SendCountRow[]>(
    `SELECT COUNT(*) AS last_hour,
            SUM(created_at > UTC_TIMESTAMP() - INTERVAL 60 SECOND) AS last_minute
     FROM email_otps
     WHERE email = ? AND purpose = ? AND created_at > UTC_TIMESTAMP() - INTERVAL 1 HOUR`,
    [email, purpose]
  );
  if (Number(counts?.last_minute ?? 0) > 0) {
    throw new HttpError(429, "Please wait a minute before requesting another code", "email");
  }
  if (Number(counts?.last_hour ?? 0) >= MAX_SENDS_PER_HOUR) {
    throw new HttpError(429, "Too many codes requested. Please try again later.", "email");
  }

  const id = randomUUID();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await pool.query("DELETE FROM email_otps WHERE created_at < UTC_TIMESTAMP() - INTERVAL 1 DAY");
  // Only the newest code works.
  await pool.query(
    "UPDATE email_otps SET consumed_at = UTC_TIMESTAMP() WHERE email = ? AND purpose = ? AND consumed_at IS NULL",
    [email, purpose]
  );
  await pool.query(
    `INSERT INTO email_otps (id, email, purpose, code_hash, created_at, expires_at)
     VALUES (?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP() + INTERVAL ? MINUTE)`,
    [id, email, purpose, hashCode(email, purpose, code), CODE_TTL_MINUTES]
  );

  try {
    await sendCodeEmail(email, purpose, code);
  } catch (error) {
    // Undelivered: drop it so it doesn't count against the send limits.
    await pool.query("DELETE FROM email_otps WHERE id = ?", [id]);
    throw error;
  }
};

// Throws unless code is the latest unexpired one for this email and purpose; a valid code is used up.
export const consumeOtp = async (email: string, purpose: OtpPurpose, code: string) => {
  const invalid = new HttpError(400, "This code is invalid or has expired. Please request a new one.", "code");
  const [rows] = await pool.query<OtpRow[]>(
    `SELECT id, code_hash, attempts FROM email_otps
     WHERE email = ? AND purpose = ? AND consumed_at IS NULL AND expires_at > UTC_TIMESTAMP()
     ORDER BY created_at DESC LIMIT 1`,
    [email, purpose]
  );
  const row = rows[0];
  if (!row || row.attempts >= MAX_ATTEMPTS) {
    throw invalid;
  }

  const matches = timingSafeEqual(Buffer.from(row.code_hash), Buffer.from(hashCode(email, purpose, code)));
  if (!matches) {
    await pool.query("UPDATE email_otps SET attempts = attempts + 1 WHERE id = ?", [row.id]);
    const attemptsLeft = MAX_ATTEMPTS - row.attempts - 1;
    throw attemptsLeft > 0
      ? new HttpError(400, `Incorrect code. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left.`, "code")
      : invalid;
  }

  const [result] = await pool.query<ResultSetHeader>(
    "UPDATE email_otps SET consumed_at = UTC_TIMESTAMP() WHERE id = ? AND consumed_at IS NULL",
    [row.id]
  );
  if (result.affectedRows !== 1) {
    throw invalid;
  }
};
