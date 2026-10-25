import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { deleteOtherSessions, findUserById, joinName, toAccount } from "../auth/sessions.js";
import { pool } from "../db/pool.js";
import { bearerToken, currentUser, requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { avatarPublicId, uploadImage } from "../services/cloudinary.js";
import { rawImageBody, requireUploadedImage } from "../utils/images.js";
import { bodyOf, forField, requireContactNumber, requireName, requireNewPassword, requireString } from "../utils/validate.js";

// The signed-in user's own profile. Email is read-only here.
export const accountRouter = Router();

accountRouter.use(requireAuth);

const accountResponse = async (userId: string) => {
  const user = await findUserById(userId);
  if (!user) {
    throw new HttpError(404, "Account not found");
  }
  return { account: toAccount(user) };
};

accountRouter.patch("/", async (req, res) => {
  const user = currentUser(res);
  const body = bodyOf(req);
  const firstName = forField("firstName", () => requireName(body.firstName, "First name"));
  const lastName = forField("lastName", () => requireName(body.lastName, "Last name"));
  const contactNumber = forField("contactNumber", () => requireContactNumber(body.contactNumber));

  await pool.query(
    "UPDATE users SET first_name = ?, last_name = ?, full_name = ?, contact_number = ? WHERE id = ?",
    [firstName, lastName, joinName(firstName, lastName), contactNumber, user.id]
  );
  res.json(await accountResponse(user.id));
});

// Raw image body (Content-Type: image/jpeg|png|webp, max 2 MB). Replaces the previous photo on Cloudinary.
accountRouter.post("/avatar", rawImageBody, async (req, res) => {
  const user = currentUser(res);
  const { image, type } = requireUploadedImage(req);
  const { url } = await uploadImage(image, type, { publicId: avatarPublicId(user.id), replace: true });

  await pool.query("UPDATE users SET avatar_url = ? WHERE id = ?", [url, user.id]);
  res.json(await accountResponse(user.id));
});

accountRouter.delete("/avatar", async (_req, res) => {
  const user = currentUser(res);
  await pool.query("UPDATE users SET avatar_url = NULL WHERE id = ?", [user.id]);
  res.json(await accountResponse(user.id));
});

interface PasswordRow extends RowDataPacket {
  password_hash: string;
}

accountRouter.post("/password", async (req, res) => {
  const user = currentUser(res);
  const body = bodyOf(req);
  const currentPassword = forField("currentPassword", () => requireString(body.currentPassword, "Current password", 200));
  const newPassword = forField("newPassword", () => requireNewPassword(body.newPassword));

  const [rows] = await pool.query<PasswordRow[]>("SELECT password_hash FROM users WHERE id = ?", [user.id]);
  if (!rows[0] || !(await verifyPassword(currentPassword, rows[0].password_hash))) {
    throw new HttpError(400, "Current password is incorrect", "currentPassword");
  }
  if (currentPassword === newPassword) {
    throw new HttpError(400, "Choose a password different from your current one", "newPassword");
  }

  await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [await hashPassword(newPassword), user.id]);
  // Other devices that knew the old password are signed out; this one stays signed in.
  const token = bearerToken(req);
  if (token) {
    await deleteOtherSessions(user.id, token);
  }
  res.status(204).end();
});
