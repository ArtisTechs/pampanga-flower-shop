import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import { pool } from "../db/pool.js";
import { HttpError } from "../middleware/errorHandler.js";

type CollectionType = "occasions" | "flowers";

interface CategoryRow extends RowDataPacket {
  id: string;
  title: string;
  route: string;
  collection_type: CollectionType;
}

interface ProductRow extends RowDataPacket {
  id: string;
  category_id: string;
  name: string;
  description: string;
  price_php: number;
  image_path: string;
  best_seller: number;
  collection_type: CollectionType;
}

// Shapes match ProductItem / ProductCategory in frontend/src/types/shop.ts. `image` is a path in the
// frontend's public folder or a Cloudinary URL; the frontend resolves it with resolveImagePath().
const toProduct = (row: ProductRow) => ({
  id: row.id,
  categoryId: row.category_id,
  name: row.name,
  description: row.description,
  pricePhp: row.price_php,
  image: row.image_path,
  bestSeller: Boolean(row.best_seller),
  catalogFilters: [row.collection_type, ...(row.best_seller ? ["best-sellers" as const] : [])]
});

const PRODUCT_SELECT = `
  SELECT p.id, p.category_id, p.name, p.description, p.price_php, p.image_path, p.best_seller, c.collection_type
  FROM products p
  JOIN categories c ON c.id = p.category_id
  WHERE p.is_active = TRUE`;

interface CollectionRow extends RowDataPacket {
  id: string;
  title: string;
  filter_label: string;
}

// Collections span categories: "best-sellers" by flag, the others by category collection_type.
const collectionCondition = (collection: string) => {
  if (collection === "best-sellers") {
    return { sql: "p.best_seller = TRUE", params: [] };
  }
  if (collection === "occasions" || collection === "flowers") {
    return { sql: "c.collection_type = ?", params: [collection] };
  }
  return null;
};

export const catalogRouter = Router();

// GET /listing?route=/category/birthday | /flowers/rose | /collection/best-sellers
// Resolves a storefront listing route to its title, filter tabs and visible products.
catalogRouter.get("/listing", async (req, res) => {
  const { route } = req.query;
  const match = typeof route === "string" ? /^\/([a-z0-9-]{1,64})\/([a-z0-9-]{1,64})$/.exec(route) : null;
  if (!match || typeof route !== "string") {
    throw new HttpError(400, "Invalid route");
  }
  const [, scope, id] = match;

  const [collections] = await pool.query<CollectionRow[]>(
    "SELECT id, title, filter_label FROM catalog_collections ORDER BY sort_order, title"
  );
  const filters = collections.map((collection) => ({ id: collection.id, label: collection.filter_label }));

  let title: string;
  let condition: { sql: string; params: string[] } | null;
  if (scope === "collection") {
    const collection = collections.find((entry) => entry.id === id);
    condition = collection ? collectionCondition(collection.id) : null;
    title = collection?.title ?? "";
  } else {
    const [categories] = await pool.query<CategoryRow[]>("SELECT id, title FROM categories WHERE route = ?", [route]);
    condition = categories[0] ? { sql: "p.category_id = ?", params: [categories[0].id] } : null;
    title = categories[0]?.title ?? "";
  }
  if (!condition) {
    throw new HttpError(404, "This collection does not exist");
  }

  const [rows] = await pool.query<ProductRow[]>(
    `${PRODUCT_SELECT} AND ${condition.sql} ORDER BY c.sort_order, p.sort_order`,
    condition.params
  );
  res.json({ title, filters, products: rows.map(toProduct) });
});

catalogRouter.get("/categories", async (_req, res) => {
  const [rows] = await pool.query<CategoryRow[]>(
    "SELECT id, title, route, collection_type FROM categories ORDER BY sort_order, title"
  );
  res.json(rows.map((row) => ({ id: row.id, title: row.title, route: row.route, collectionType: row.collection_type })));
});

// GET /products?category=<id>&collection=occasions|flowers|best-sellers
catalogRouter.get("/products", async (req, res) => {
  const { category, collection } = req.query;
  const conditions: string[] = [];
  const params: string[] = [];

  if (category !== undefined) {
    if (typeof category !== "string" || !/^[a-z0-9-]{1,64}$/.test(category)) {
      throw new HttpError(400, "Invalid category");
    }
    conditions.push("p.category_id = ?");
    params.push(category);
  }

  if (collection !== undefined) {
    const condition = typeof collection === "string" ? collectionCondition(collection) : null;
    if (!condition) {
      throw new HttpError(400, "Invalid collection");
    }
    conditions.push(condition.sql);
    params.push(...condition.params);
  }

  const where = conditions.map((condition) => ` AND ${condition}`).join("");
  const [rows] = await pool.query<ProductRow[]>(`${PRODUCT_SELECT}${where} ORDER BY c.sort_order, p.sort_order`, params);
  res.json(rows.map(toProduct));
});

catalogRouter.get("/products/:id", async (req, res) => {
  const [rows] = await pool.query<ProductRow[]>(`${PRODUCT_SELECT} AND p.id = ?`, [req.params.id]);
  if (rows.length === 0) {
    throw new HttpError(404, "Product not found");
  }
  res.json(toProduct(rows[0]));
});
