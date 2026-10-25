import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { listGeneratedPreviews, loadBuilderOptions, type BuilderGroup } from "../../db/builder.js";
import { pool } from "../../db/pool.js";
import { SITE_CONTENT_FIELDS, SITE_CONTENT_KEYS, saveSiteContent, type SiteContent } from "../../db/siteContent.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { bodyOf, requireId, requireString } from "../../utils/validate.js";

const MAX_OPTION_PRICE_PHP = 1_000_000;

interface AvailableCountRow extends RowDataPacket {
  available_in_group: number;
}

export const adminContentRouter = Router();

adminContentRouter.put("/site-content", async (req, res) => {
  const body = bodyOf(req);
  const content = Object.fromEntries(
    SITE_CONTENT_KEYS.map((key) => [key, requireString(body[key], key, SITE_CONTENT_FIELDS[key])])
  ) as SiteContent;
  await saveSiteContent(content);
  res.json(content);
});

// All builder options, including unavailable ones, for the admin settings table.
adminContentRouter.get("/builder-options", async (_req, res) => {
  res.json(await loadBuilderOptions(false));
});

const findOption = async (id: string) => {
  const option = (await loadBuilderOptions(false)).find((entry) => entry.id === id);
  if (!option) {
    throw new HttpError(404, "Builder option not found");
  }
  return option;
};

// Sizes are the bouquet's base price, so they can't be free; every other option may be 0 (included).
const parseOptionPrice = (value: unknown, group: BuilderGroup) => {
  const minimum = group === "size" ? 1 : 0;
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum || value > MAX_OPTION_PRICE_PHP
    || Math.abs(Math.round(value * 100) - value * 100) > 1e-6) {
    throw new HttpError(
      400,
      group === "size"
        ? "Price must be a positive amount with at most 2 decimals"
        : "Price must be 0 or more with at most 2 decimals"
    );
  }
  return value;
};

// Body: { available?: boolean, pricePhp?: number }, at least one of them.
adminContentRouter.patch("/builder-options/:id", async (req, res) => {
  const id = requireId(req.params.id, "option");
  const body = bodyOf(req);
  if (body.available === undefined && body.pricePhp === undefined) {
    throw new HttpError(400, "Nothing to update");
  }
  if (body.available !== undefined && typeof body.available !== "boolean") {
    throw new HttpError(400, "available must be true or false");
  }
  const option = await findOption(id);
  const available = body.available ?? option.available;
  const pricePhp = body.pricePhp === undefined ? option.pricePhp : parseOptionPrice(body.pricePhp, option.group);

  if (!available && option.available && option.group !== "filler") {
    // The customizer needs at least one choice in every group except the optional fillers.
    const [[row]] = await pool.query<AvailableCountRow[]>(
      `SELECT COUNT(*) AS available_in_group FROM builder_options
       WHERE is_available = TRUE AND id <> ? AND option_group = ?`,
      [id, option.group]
    );
    if (Number(row.available_in_group) === 0) {
      throw new HttpError(409, "At least one option in this group must stay available");
    }
  }

  await pool.query("UPDATE builder_options SET is_available = ?, price_php = ? WHERE id = ?", [available, pricePhp, id]);
  res.json(await findOption(id));
});

// AI-generated customizer previews, newest first, so the admin can check them.
adminContentRouter.get("/builder-previews", async (_req, res) => {
  res.json(await listGeneratedPreviews());
});

// Removes a preview from the cache; the next customer with that selection gets a freshly generated image.
adminContentRouter.delete("/builder-previews/:key", async (req, res) => {
  const key = req.params.key;
  if (!/^[0-9a-f]{40}$/.test(key)) {
    throw new HttpError(400, "Invalid preview");
  }
  const [result] = await pool.query<ResultSetHeader>("DELETE FROM builder_generated_previews WHERE selection_key = ?", [key]);
  if (result.affectedRows === 0) {
    throw new HttpError(404, "Preview not found");
  }
  res.status(204).end();
});
