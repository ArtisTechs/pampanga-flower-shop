import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { ResultSetHeader } from "mysql2";
import { config } from "../../config.js";
import { PAYMENT_METHOD_KINDS, findPaymentMethod, loadPaymentMethods } from "../../db/paymentMethods.js";
import { pool } from "../../db/pool.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { isCloudinaryImageUrl, uploadImage } from "../../services/cloudinary.js";
import { rawImageBody, requireUploadedImage } from "../../utils/images.js";
import { bodyOf, requireId, requireOneOf, requireString } from "../../utils/validate.js";

const parsePaymentMethodInput = (body: Record<string, unknown>) => {
  const accountNumber = requireString(body.accountNumber, "Account number", 64);
  if (!/^[0-9A-Za-z+()\s.-]+$/.test(accountNumber)) {
    throw new HttpError(400, "Account number can only contain letters, numbers, spaces, and dashes");
  }
  // The QR code is optional: some banks only share an account number.
  let qrImageUrl: string | null = null;
  if (body.qrImageUrl !== null && body.qrImageUrl !== undefined) {
    qrImageUrl = requireString(body.qrImageUrl, "QR image", 500);
    if (!isCloudinaryImageUrl(qrImageUrl)) {
      throw new HttpError(400, "Please upload the QR code image");
    }
  }
  if (typeof body.active !== "boolean") {
    throw new HttpError(400, "active must be true or false");
  }

  return {
    kind: requireOneOf(body.kind, "Type", PAYMENT_METHOD_KINDS),
    provider: requireString(body.provider, "Bank or e-wallet name", 80),
    accountName: requireString(body.accountName, "Account name", 120),
    accountNumber,
    qrImageUrl,
    active: body.active
  };
};

const requirePaymentMethod = async (id: string) => {
  const method = await findPaymentMethod(id);
  if (!method) {
    throw new HttpError(404, "Payment method not found");
  }
  return method;
};

export const adminPaymentMethodsRouter = Router();

adminPaymentMethodsRouter.get("/payment-methods", async (_req, res) => {
  res.json(await loadPaymentMethods(false));
});

adminPaymentMethodsRouter.post("/payment-methods", async (req, res) => {
  const input = parsePaymentMethodInput(bodyOf(req));
  const id = randomUUID();
  await pool.query(
    `INSERT INTO payment_methods (id, kind, provider, account_name, account_number, qr_image_url, is_active, sort_order)
     SELECT ?, ?, ?, ?, ?, ?, ?, COALESCE(MAX(sort_order), 0) + 1 FROM payment_methods`,
    [id, input.kind, input.provider, input.accountName, input.accountNumber, input.qrImageUrl, input.active]
  );
  res.status(201).json(await requirePaymentMethod(id));
});

adminPaymentMethodsRouter.patch("/payment-methods/:id", async (req, res) => {
  const id = requireId(req.params.id, "payment method");
  const input = parsePaymentMethodInput(bodyOf(req));
  const [result] = await pool.query<ResultSetHeader>(
    `UPDATE payment_methods
     SET kind = ?, provider = ?, account_name = ?, account_number = ?, qr_image_url = ?, is_active = ?
     WHERE id = ?`,
    [input.kind, input.provider, input.accountName, input.accountNumber, input.qrImageUrl, input.active, id]
  );
  if (result.affectedRows === 0) {
    throw new HttpError(404, "Payment method not found");
  }
  res.json(await requirePaymentMethod(id));
});

// Orders keep their own copy of the method's details, so deleting one doesn't change past orders.
adminPaymentMethodsRouter.delete("/payment-methods/:id", async (req, res) => {
  const id = requireId(req.params.id, "payment method");
  const [result] = await pool.query<ResultSetHeader>("DELETE FROM payment_methods WHERE id = ?", [id]);
  if (result.affectedRows === 0) {
    throw new HttpError(404, "Payment method not found");
  }
  res.status(204).end();
});

// Raw image body (Content-Type: image/jpeg|png|webp, max 3 MB) -> uploaded to Cloudinary.
adminPaymentMethodsRouter.post("/uploads/payment-qr", rawImageBody, async (req, res) => {
  const { image, type } = requireUploadedImage(req);
  const { url } = await uploadImage(image, type, { folder: config.cloudinary.paymentQrFolder });
  res.status(201).json({ url });
});
