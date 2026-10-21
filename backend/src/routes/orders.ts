import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { loadBuilderOptions, loadBuilderPreviews, type BuilderGroup, type BuilderOption } from "../db/builder.js";
import { pool } from "../db/pool.js";
import { currentUser, requireAuth } from "../middleware/auth.js";
import { HttpError } from "../middleware/errorHandler.js";
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
  customization: { size: string; palette: string; wrap: string; ribbon: string } | null;
  flowers: Array<{ code: string; name: string; quantity: number }>;
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

// Prices always come from the database; the client only sends what was chosen.
const buildCustomLine = (
  custom: Record<string, unknown>,
  quantity: number,
  options: BuilderOption[],
  maxFlowers: number
): OrderLine => {
  const pick = (group: BuilderGroup, value: unknown, label: string) => {
    const option = options.find((entry) => entry.group === group && entry.code === value);
    if (!option) {
      throw new HttpError(400, `${label} is not available`);
    }
    return option;
  };

  const size = pick("size", custom.size, "Bouquet size");
  const palette = pick("palette", custom.palette, "Color palette");
  const wrap = pick("wrap", custom.wrap, "Wrap style");
  const ribbon = pick("ribbon", custom.ribbon, "Ribbon");

  if (!Array.isArray(custom.flowers) || custom.flowers.length === 0) {
    throw new HttpError(400, "Choose at least one flower");
  }
  const flowerCounts = new Map<string, number>();
  for (const entry of custom.flowers) {
    if (!isRecord(entry)) {
      throw new HttpError(400, "Invalid flower selection");
    }
    const flower = pick("flower", entry.code, "Flower");
    const count = requireInt(entry.quantity, "Flower quantity", 1, maxFlowers);
    flowerCounts.set(flower.code, (flowerCounts.get(flower.code) ?? 0) + count);
  }
  const totalFlowers = [...flowerCounts.values()].reduce((total, count) => total + count, 0);
  if (totalFlowers > maxFlowers) {
    throw new HttpError(400, `A bouquet can have at most ${maxFlowers} flowers`);
  }

  const flowers = [...flowerCounts].map(([code, count]) => {
    const flower = options.find((entry) => entry.group === "flower" && entry.code === code)!;
    return { code, name: flower.name, quantity: count, pricePhp: flower.pricePhp };
  });
  const flowerSummary = flowers.map((flower) => `${flower.name} x${flower.quantity}`).join(", ");

  return {
    productId: null,
    name: `Custom ${size.name} Bouquet - ${palette.name}, ${wrap.name}, ${ribbon.name} (${flowerSummary})`,
    unitPricePhp: size.pricePhp + flowers.reduce((total, flower) => total + flower.pricePhp * flower.quantity, 0),
    quantity,
    customization: { size: size.name, palette: palette.name, wrap: wrap.name, ribbon: ribbon.name },
    flowers: flowers.map(({ code, name, quantity: count }) => ({ code, name, quantity: count }))
  };
};

export const ordersRouter = Router();

ordersRouter.post("/", requireAuth, async (req, res) => {
  const user = currentUser(res);
  const body = bodyOf(req);
  const pickupAt = parsePickupAt(body.pickupAt);

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
  const maxFlowers = Math.max(1, ...previews.map((preview) => preview.flowerCount));

  const lines: OrderLine[] = items.map((item) => {
    const quantity = requireInt(item.quantity, "Quantity", 1, MAX_QUANTITY);
    if (isRecord(item.custom)) {
      return buildCustomLine(item.custom, quantity, builderOptions, maxFlowers);
    }
    const product = productRows.find((row) => row.id === item.productId);
    if (!product) {
      throw new HttpError(400, "A product in your cart is no longer available");
    }
    return { productId: product.id, name: product.name, unitPricePhp: product.price_php, quantity, customization: null, flowers: [] };
  });

  const totalPhp = lines.reduce((total, line) => total + line.unitPricePhp * line.quantity, 0);
  const sizeName = lines.find((line) => line.customization)?.customization?.size;
  const bouquetSize = sizeName && ORDER_BOUQUET_SIZES.includes(sizeName) ? sizeName : null;
  const orderId = randomUUID();
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query(
      `INSERT INTO orders (id, user_id, customer_name, contact_number, bouquet_size, pickup_at, total_php)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [orderId, user.id, user.fullName, user.contactNumber || "N/A", bouquetSize, pickupAt, totalPhp]
    );
    for (const line of lines) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO order_items (order_id, product_id, product_name, unit_price_php, quantity, customization)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, line.productId, line.name, line.unitPricePhp, line.quantity, line.customization ? JSON.stringify(line.customization) : null]
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

  res.status(201).json({ id: orderId, totalPhp, pickupAt: pickupAt.toISOString(), status: "Pending" });
});
