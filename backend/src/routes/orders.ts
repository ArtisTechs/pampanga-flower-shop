import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import {
  findGeneratedPreview,
  loadBuilderOptions,
  loadBuilderPreviews,
  maxFlowersOf,
  parseBouquetSelection,
  selectionKey,
  type BuilderOption
} from "../db/builder.js";
import { config } from "../config.js";
import { loadOrderItems } from "../db/orders.js";
import { findPaymentMethod } from "../db/paymentMethods.js";
import { pool } from "../db/pool.js";
import { currentUser, requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
import { uploadImage } from "../services/cloudinary.js";
import { rawImageBody, requireUploadedImage } from "../utils/images.js";
import { bodyOf, isRecord, requireId, requireInt } from "../utils/validate.js";

const MAX_LINES = 20;
const MAX_QUANTITY = 20;
const MIN_LEAD_MS = 60 * 60 * 1000;
const MAX_ADVANCE_MS = 60 * 24 * 60 * 60 * 1000;
const ORDER_BOUQUET_SIZES = ["Small", "Medium", "Large", "Extra Large"];

interface ProductPriceRow extends RowDataPacket {
  id: string;
  name: string;
  price_php: number;
}

interface OrderLine {
  productId: string | null;
  name: string;
  unitPricePhp: number;
  quantity: number;
  customization: { size: string; palette: string; wrap: string; ribbon: string; fillers: string[] } | null;
  flowers: Array<{ code: string; name: string; quantity: number }>;
  previewImage: string | null;
}

const parsePickupAt = (value: unknown) => {
  const pickupAt = typeof value === "string" ? new Date(value) : new Date(NaN);
  if (Number.isNaN(pickupAt.getTime())) {
    throw new HttpError(400, "Pick-up date and time is required");
  }
  const leadMs = pickupAt.getTime() - Date.now();
  if (leadMs < MIN_LEAD_MS || leadMs > MAX_ADVANCE_MS) {
    throw new HttpError(400, "Pick-up must be at least 1 hour from now and within 60 days");
  }
  return pickupAt;
};

// Prices always come from the database; the client only sends what was chosen. The preview image is the
// cached one for this exact selection, never a URL from the client.
const buildCustomLine = async (
  custom: Record<string, unknown>,
  quantity: number,
  options: BuilderOption[],
  maxFlowers: number
): Promise<OrderLine> => {
  const { size, palette, wrap, ribbon, flowers, fillers } = parseBouquetSelection(custom, options, maxFlowers);
  const flowerSummary = flowers.map(({ option, quantity: count }) => `${option.name} x${count}`).join(", ");
  const fillerSummary = fillers.length > 0 ? ` with ${fillers.map((filler) => filler.name).join(", ")}` : "";
  const selection = { size, palette, wrap, ribbon, flowers, fillers };

  return {
    productId: null,
    name: `Custom ${size.name} Bouquet - ${palette.name}, ${wrap.name}, ${ribbon.name} (${flowerSummary}${fillerSummary})`,
    // Palette, wrap and ribbon are usually 0 (included) unless the admin sets a price.
    unitPricePhp: size.pricePhp + palette.pricePhp + wrap.pricePhp + ribbon.pricePhp
      + flowers.reduce((total, { option, quantity: count }) => total + option.pricePhp * count, 0)
      + fillers.reduce((total, filler) => total + filler.pricePhp, 0),
    quantity,
    customization: {
      size: size.name,
      palette: palette.name,
      wrap: wrap.name,
      ribbon: ribbon.name,
      fillers: fillers.map((filler) => filler.name)
    },
    flowers: flowers.map(({ option, quantity: count }) => ({ code: option.code, name: option.name, quantity: count })),
    previewImage: await findGeneratedPreview(selectionKey(selection))
  };
};

// Payment states in which the customer may (re)send a screenshot.
const PROOF_UPLOAD_STATUSES = ["Awaiting payment", "Rejected"];

interface MyOrderRow extends RowDataPacket {
  id: string;
  pickup_at: Date;
  created_at: Date;
  total_php: number;
  status: "Pending" | "Ready" | "Completed";
  payment_status: "Pay on pick-up" | "Awaiting payment" | "For verification" | "Verified" | "Rejected";
  payment_provider: string | null;
  payment_account_name: string | null;
  payment_account_number: string | null;
  payment_note: string | null;
  item_count: number;
  item_names: string | null;
}

// Shape matches CustomerOrder in frontend/src/types/shop.ts.
const toCustomerOrder = (row: MyOrderRow) => ({
  id: row.id,
  pickupAt: row.pickup_at.toISOString(),
  createdAt: row.created_at.toISOString(),
  totalPhp: row.total_php,
  status: row.status,
  paymentStatus: row.payment_status,
  // Where to send the payment (copied at order time) and, after a rejection, the shop's reason.
  payment: row.payment_provider
    ? { provider: row.payment_provider, accountName: row.payment_account_name, accountNumber: row.payment_account_number }
    : null,
  paymentNote: row.payment_note,
  itemCount: Number(row.item_count),
  itemNames: row.item_names ? row.item_names.split("\n") : []
});

const MY_ORDER_SELECT = `
  SELECT o.id, o.pickup_at, o.created_at, o.total_php, o.status, o.payment_status,
         o.payment_provider, o.payment_account_name, o.payment_account_number, o.payment_note,
         COALESCE(SUM(oi.quantity), 0) AS item_count,
         GROUP_CONCAT(oi.product_name ORDER BY oi.id SEPARATOR '\\n') AS item_names
  FROM orders o
  LEFT JOIN order_items oi ON oi.order_id = o.id`;

export const ordersRouter = Router();

// The logged-in customer's own orders, newest first.
ordersRouter.get("/", requireAuth, async (_req, res) => {
  const user = currentUser(res);
  const [rows] = await pool.query<MyOrderRow[]>(
    `${MY_ORDER_SELECT} WHERE o.user_id = ? GROUP BY o.id ORDER BY o.created_at DESC`,
    [user.id]
  );
  res.json(rows.map(toCustomerOrder));
});

// Another customer's order is reported as not found, so order ids can't be probed.
ordersRouter.get("/:id", requireAuth, async (req, res) => {
  const user = currentUser(res);
  const id = requireId(req.params.id, "order");
  const [rows] = await pool.query<MyOrderRow[]>(
    `${MY_ORDER_SELECT} WHERE o.id = ? AND o.user_id = ? GROUP BY o.id`,
    [id, user.id]
  );
  if (rows.length === 0) {
    throw new HttpError(404, "Order not found");
  }
  res.json({ ...toCustomerOrder(rows[0]), items: await loadOrderItems(id) });
});

ordersRouter.post("/", requireAuth, async (req, res) => {
  const user = currentUser(res);
  const body = bodyOf(req);
  const pickupAt = parsePickupAt(body.pickupAt);
  const paymentMethod = await findPaymentMethod(requireId(body.paymentMethodId, "payment method"));
  if (!paymentMethod?.active) {
    throw new HttpError(400, "This payment method is no longer available. Please choose another.");
  }

  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > MAX_LINES) {
    throw new HttpError(400, `Order must have 1 to ${MAX_LINES} items`);
  }
  const items = body.items.map((item) => {
    if (!isRecord(item)) {
      throw new HttpError(400, "Invalid order item");
    }
    return item;
  });

  const productIds = items.filter((item) => item.productId !== undefined).map((item) => requireId(item.productId, "product"));
  const [productRows] = productIds.length > 0
    ? await pool.query<ProductPriceRow[]>("SELECT id, name, price_php FROM products WHERE is_active = TRUE AND id IN (?)", [productIds])
    : [[] as ProductPriceRow[]];
  const hasCustom = items.some((item) => item.custom !== undefined);
  const [builderOptions, previews] = hasCustom
    ? await Promise.all([loadBuilderOptions(true), loadBuilderPreviews()])
    : [[], []];
  const maxFlowers = maxFlowersOf(previews);

  const lines: OrderLine[] = await Promise.all(items.map(async (item) => {
    const quantity = requireInt(item.quantity, "Quantity", 1, MAX_QUANTITY);
    if (isRecord(item.custom)) {
      return buildCustomLine(item.custom, quantity, builderOptions, maxFlowers);
    }
    const product = productRows.find((row) => row.id === item.productId);
    if (!product) {
      throw new HttpError(400, "A product in your cart is no longer available");
    }
    return {
      productId: product.id, name: product.name, unitPricePhp: product.price_php, quantity, customization: null, flowers: [], previewImage: null
    };
  }));

  const totalPhp = lines.reduce((total, line) => total + line.unitPricePhp * line.quantity, 0);
  const sizeName = lines.find((line) => line.customization)?.customization?.size;
  const bouquetSize = sizeName && ORDER_BOUQUET_SIZES.includes(sizeName) ? sizeName : null;
  const orderId = randomUUID();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO orders (id, user_id, customer_name, contact_number, bouquet_size, pickup_at, total_php,
                           payment_status, payment_provider, payment_account_name, payment_account_number)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Awaiting payment', ?, ?, ?)`,
      [
        orderId, user.id, user.fullName, user.contactNumber || "N/A", bouquetSize, pickupAt, totalPhp,
        paymentMethod.provider, paymentMethod.accountName, paymentMethod.accountNumber
      ]
    );
    for (const line of lines) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price_php, quantity, customization, preview_image_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId, line.productId, line.name, line.unitPricePhp, line.quantity,
          line.customization ? JSON.stringify(line.customization) : null, line.previewImage
        ]
      );
      if (line.flowers.length > 0) {
        await connection.query(
          "INSERT INTO order_item_flowers (order_item_id, flower_code, flower_name, quantity) VALUES ?",
          [line.flowers.map((flower) => [result.insertId, flower.code, flower.name, flower.quantity])]
        );
      }
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  res.status(201).json({
    id: orderId,
    totalPhp,
    pickupAt: pickupAt.toISOString(),
    status: "Pending",
    paymentStatus: "Awaiting payment"
  });
});

interface PaymentStateRow extends RowDataPacket {
  payment_status: string;
}

// Raw image body (Content-Type: image/jpeg|png|webp, max 2 MB): the customer's payment screenshot.
// Sent right after placing the order, or again after the shop rejected the previous one.
ordersRouter.post("/:id/payment-proof", requireAuth, rawImageBody, async (req, res) => {
  const user = currentUser(res);
  const id = requireId(req.params.id, "order");
  const [orders] = await pool.query<PaymentStateRow[]>(
    "SELECT payment_status FROM orders WHERE id = ? AND user_id = ?",
    [id, user.id]
  );
  if (orders.length === 0) {
    throw new HttpError(404, "Order not found");
  }
  if (!PROOF_UPLOAD_STATUSES.includes(orders[0].payment_status)) {
    throw new HttpError(409, "This order's payment has already been sent for verification");
  }

  const { image, type } = requireUploadedImage(req);
  const { url } = await uploadImage(image, type, {
    publicId: `${config.cloudinary.paymentProofFolder}/${id}`,
    replace: true
  });
  await pool.query(
    `UPDATE orders
     SET payment_status = 'For verification', payment_proof_url = ?, payment_submitted_at = CURRENT_TIMESTAMP,
         payment_reviewed_at = NULL, payment_note = NULL
     WHERE id = ? AND user_id = ? AND payment_status IN (?)`,
    [url, id, user.id, PROOF_UPLOAD_STATUSES]
  );

  const [rows] = await pool.query<MyOrderRow[]>(
    `${MY_ORDER_SELECT} WHERE o.id = ? AND o.user_id = ? GROUP BY o.id`,
    [id, user.id]
  );
  res.json(toCustomerOrder(rows[0]));
});
