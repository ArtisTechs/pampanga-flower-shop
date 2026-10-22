import express, { Router } from "express";
import type { RowDataPacket } from "mysql2";
import { pool } from "../../db/pool.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { isCloudinaryImageUrl, uploadImage } from "../../services/cloudinary.js";
import { bodyOf, requireId, requireString } from "../../utils/validate.js";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const MAX_PRICE_PHP = 1_000_000;

interface AdminProductRow extends RowDataPacket {
  id: string;
  category_id: string;
  category_title: string;
  name: string;
  description: string;
  price_php: number;
  image_path: string;
  best_seller: number;
  is_active: number;
}

const PRODUCT_SELECT = `
  SELECT p.id, p.category_id, c.title AS category_title, p.name, p.description, p.price_php,
         p.image_path, p.best_seller, p.is_active
  FROM products p
  JOIN categories c ON c.id = p.category_id`;

// Shape matches AdminProduct in frontend/src/types/shop.ts. imagePath is a Cloudinary URL.
const toAdminProduct = (row: AdminProductRow) => ({
  id: row.id,
  categoryId: row.category_id,
  categoryTitle: row.category_title,
  name: row.name,
  description: row.description,
  pricePhp: row.price_php,
  imagePath: row.image_path,
  bestSeller: Boolean(row.best_seller),
  active: Boolean(row.is_active)
});

// Checks the file signature too, not just the Content-Type header the client sent.
const hasImageSignature = (data: Buffer, type: (typeof IMAGE_TYPES)[number]) => {
  if (type === "image/jpeg") {
    return data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  }
  if (type === "image/png") {
    return data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return data.subarray(0, 4).toString("latin1") === "RIFF" && data.subarray(8, 12).toString("latin1") === "WEBP";
};

// All product images live on Cloudinary (seeded ones were moved by `npm run images:migrate`).
const requireImagePath = (value: unknown) => {
  const imagePath = requireString(value, "Image", 500);
  if (!isCloudinaryImageUrl(imagePath)) {
    throw new HttpError(400, "Please upload a product image");
  }
  return imagePath;
};

const parseProductInput = async (body: Record<string, unknown>) => {
  const categoryId = requireId(body.categoryId, "category");
  const [categories] = await pool.query<RowDataPacket[]>("SELECT id FROM categories WHERE id = ?", [categoryId]);
  if (categories.length === 0) {
    throw new HttpError(400, "Category not found");
  }

  const pricePhp = body.pricePhp;
  if (typeof pricePhp !== "number" || !Number.isFinite(pricePhp) || pricePhp <= 0 || pricePhp > MAX_PRICE_PHP
    || Math.abs(Math.round(pricePhp * 100) - pricePhp * 100) > 1e-6) {
    throw new HttpError(400, "Price must be a positive amount with at most 2 decimals");
  }
  if (typeof body.bestSeller !== "boolean" || typeof body.active !== "boolean") {
    throw new HttpError(400, "bestSeller and active must be true or false");
  }
  if (body.description !== undefined && typeof body.description !== "string") {
    throw new HttpError(400, "Description must be text");
  }
  const description = (body.description ?? "").trim();
  if (description.length > 1000) {
    throw new HttpError(400, "Description is required (max 1000 characters)");
  }

  return {
    categoryId,
    name: requireString(body.name, "Name", 160),
    description,
    pricePhp,
    imagePath: requireImagePath(body.imagePath),
    bestSeller: body.bestSeller,
    active: body.active
  };
};

const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "item";

// Readable ids like the seeded ones ("<category>-<name>"), with a numeric suffix when taken.
const generateProductId = async (categoryId: string, name: string) => {
  const baseId = `${categoryId}-${slugify(name)}`;
  const [rows] = await pool.query<RowDataPacket[]>("SELECT id FROM products WHERE id = ? OR id LIKE ?", [
    baseId,
    `${baseId}-%`
  ]);
  const taken = new Set(rows.map((row) => row.id as string));
  let candidate = baseId;
  for (let suffix = 2; taken.has(candidate); suffix++) {
    candidate = `${baseId}-${suffix}`;
  }
  return candidate;
};

const findProduct = async (id: string) => {
  const [rows] = await pool.query<AdminProductRow[]>(`${PRODUCT_SELECT} WHERE p.id = ?`, [id]);
  if (rows.length === 0) {
    throw new HttpError(404, "Product not found");
  }
  return toAdminProduct(rows[0]);
};

export const adminProductsRouter = Router();

// All products, including hidden ones.
adminProductsRouter.get("/products", async (_req, res) => {
  const [rows] = await pool.query<AdminProductRow[]>(`${PRODUCT_SELECT} ORDER BY c.sort_order, p.sort_order, p.name`);
  res.json(rows.map(toAdminProduct));
});

adminProductsRouter.post("/products", async (req, res) => {
  const input = await parseProductInput(bodyOf(req));
  const id = await generateProductId(input.categoryId, input.name);

  await pool.query(
    `INSERT INTO products (id, category_id, name, description, price_php, image_path, best_seller, is_active, sort_order)
     SELECT ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(MAX(sort_order), 0) + 1 FROM products WHERE category_id = ?`,
    [id, input.categoryId, input.name, input.description, input.pricePhp, input.imagePath, input.bestSeller, input.active, input.categoryId]
  );
  res.status(201).json(await findProduct(id));
});

adminProductsRouter.patch("/products/:id", async (req, res) => {
  const id = requireId(req.params.id, "product");
  await findProduct(id);
  const input = await parseProductInput(bodyOf(req));

  await pool.query(
    `UPDATE products
     SET category_id = ?, name = ?, description = ?, price_php = ?, image_path = ?, best_seller = ?, is_active = ?
     WHERE id = ?`,
    [input.categoryId, input.name, input.description, input.pricePhp, input.imagePath, input.bestSeller, input.active, id]
  );
  res.json(await findProduct(id));
});

// Raw image body (Content-Type: image/jpeg|png|webp, max 2 MB) -> uploaded to Cloudinary.
adminProductsRouter.post(
  "/uploads/product-image",
  express.raw({ type: [...IMAGE_TYPES], limit: MAX_IMAGE_BYTES }),
  async (req, res) => {
    const type = IMAGE_TYPES.find((imageType) => req.is(imageType));
    if (!type || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw new HttpError(415, "Upload a JPG, PNG, or WebP image");
    }
    if (!hasImageSignature(req.body, type)) {
      throw new HttpError(415, "The file is not a valid JPG, PNG, or WebP image");
    }

    const { url } = await uploadImage(req.body, type);
    res.status(201).json({ url });
  }
);
