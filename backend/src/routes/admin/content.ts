import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { config } from "../../config.js";
import {
  BUILDER_GROUPS,
  listCombinationPhotos,
  listGeneratedPreviews,
  loadBuilderOptions,
  loadBuilderPreviews,
  maxFlowersOf,
  STOCKED_GROUPS,
  type BuilderGroup,
  type BuilderOption,
  type FlowerColor
} from "../../db/builder.js";
import { pool } from "../../db/pool.js";
import { SITE_CONTENT_FIELDS, SITE_CONTENT_KEYS, saveSiteContent, type SiteContent } from "../../db/siteContent.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { isCloudinaryImageUrl, uploadImage } from "../../services/cloudinary.js";
import { combinationKey, type CombinationSpec } from "../../utils/combinationKey.js";
import { rawImageBody, requireUploadedImage } from "../../utils/images.js";
import { bodyOf, isRecord, requireId, requireInt, requireOneOf, requireString } from "../../utils/validate.js";

const MAX_OPTION_PRICE_PHP = 1_000_000;
const MAX_SWATCHES = 6;
const MAX_FLOWER_COLORS = 12;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
// Groups whose starting choice the admin picks; flowers and fillers start unselected.
const DEFAULT_GROUPS: BuilderGroup[] = ["size", "palette", "wrap", "ribbon"];
// Groups shown as color swatches (palettes always need at least one).
const SWATCH_GROUPS: BuilderGroup[] = ["palette", "filler"];

interface AvailableCountRow extends RowDataPacket {
  available_in_group: number;
}

interface PhotoImageRow extends RowDataPacket {
  image_url: string;
  source_path: string;
}

interface CodeRow extends RowDataPacket {
  code: string;
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

const parseSwatches = (value: unknown, group: BuilderGroup) => {
  if (!Array.isArray(value) || value.length > MAX_SWATCHES
    || value.some((color) => typeof color !== "string" || !HEX_COLOR.test(color))) {
    throw new HttpError(400, `Colors must be up to ${MAX_SWATCHES} hex colors like #c91f1f`);
  }
  if (group === "palette" && value.length === 0) {
    throw new HttpError(400, "A palette needs at least one color");
  }
  return value.map((color: string) => color.toLowerCase());
};

// The colors a customer can pick for a flower: unique names and exactly one default.
const parseColorChoices = (value: unknown): FlowerColor[] => {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_FLOWER_COLORS) {
    throw new HttpError(400, `Add 1 to ${MAX_FLOWER_COLORS} colors for this flower`);
  }
  const choices = value.map((entry) => {
    if (!isRecord(entry) || typeof entry.hex !== "string" || !HEX_COLOR.test(entry.hex) || typeof entry.isDefault !== "boolean") {
      throw new HttpError(400, "Each flower color needs a name, a hex color like #c91f1f, and whether it's the default");
    }
    return { name: requireString(entry.name, "Color name", 40), hex: entry.hex.toLowerCase(), isDefault: entry.isDefault };
  });
  if (new Set(choices.map((choice) => choice.name.toLowerCase())).size !== choices.length) {
    throw new HttpError(400, "Each flower color needs a different name");
  }
  if (choices.filter((choice) => choice.isDefault).length !== 1) {
    throw new HttpError(400, "Pick exactly one default color for this flower");
  }
  return choices;
};

const parseImageUrl = (value: unknown) => {
  if (value === null) {
    return null;
  }
  const url = requireString(value, "Image", 500);
  if (!isCloudinaryImageUrl(url)) {
    throw new HttpError(400, "Please upload the image");
  }
  return url;
};

const parseBoolean = (value: unknown, field: string) => {
  if (typeof value !== "boolean") {
    throw new HttpError(400, `${field} must be true or false`);
  }
  return value;
};

interface OptionFields {
  name: string;
  description: string;
  pricePhp: number;
  colors: string[] | null;
  colorChoices: FlowerColor[] | null;
  imageUrl: string | null;
  available: boolean;
  isDefault: boolean;
}

// Every field of an option; on an update, fields left out of the body keep their current value.
const parseOptionFields = (body: Record<string, unknown>, group: BuilderGroup, current: BuilderOption | null): OptionFields => {
  const field = <T>(key: string, parse: (value: unknown) => T, fallback: () => T): T =>
    body[key] === undefined ? fallback() : parse(body[key]);
  const required = (label: string) => () => {
    throw new HttpError(400, `${label} is required`);
  };

  const colorChoices = group === "flower"
    ? field("colorChoices", parseColorChoices, current ? () => current.colorChoices : required("At least one flower color"))
    : null;
  return {
    name: field("name", (value) => requireString(value, "Name", 120), current ? () => current.name : required("Name")),
    description: field("description", (value) => requireString(value, "Description", 500, 0), () => current?.description ?? ""),
    pricePhp: field("pricePhp", (value) => parseOptionPrice(value, group), current ? () => current.pricePhp : required("Price")),
    // A flower's swatch is its default color, so places that show one dot stay in step.
    colors: colorChoices
      ? [colorChoices.find((choice) => choice.isDefault)!.hex]
      : SWATCH_GROUPS.includes(group)
        ? field("colors", (value) => parseSwatches(value, group), current ? () => current.colors : required("Colors"))
        : null,
    colorChoices,
    // Only wraps show a photo in the customizer.
    imageUrl: group === "wrap" ? field("imageUrl", parseImageUrl, () => current?.imageUrl ?? null) : null,
    available: field("available", (value) => parseBoolean(value, "available"), () => current?.available ?? true),
    isDefault: DEFAULT_GROUPS.includes(group)
      ? field("isDefault", (value) => parseBoolean(value, "isDefault"), () => current?.isDefault ?? false)
      : false
  };
};

// The customizer needs at least one choice in every group except the optional fillers.
const ensureAnotherAvailable = async (option: BuilderOption, message: string) => {
  if (!option.available || option.group === "filler") {
    return;
  }
  const [[row]] = await pool.query<AvailableCountRow[]>(
    `SELECT COUNT(*) AS available_in_group FROM builder_options
     WHERE is_available = TRUE AND id <> ? AND option_group = ?`,
    [option.id, option.group]
  );
  if (Number(row.available_in_group) === 0) {
    throw new HttpError(409, message);
  }
};

// One starting choice per group.
const clearOtherDefaults = async (group: BuilderGroup, id: string) => {
  await pool.query("UPDATE builder_options SET is_default = FALSE WHERE option_group = ? AND id <> ?", [group, id]);
};

const jsonOrNull = (value: unknown) => (value === null ? null : JSON.stringify(value));

// A short code from the name ("Pastel Pink" -> "pastel-pink"), made unique within the group. Codes never change,
// since cached previews and stock photos refer to them.
const uniqueCode = async (group: BuilderGroup, name: string) => {
  const base = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 24) || "option";
  const [rows] = await pool.query<CodeRow[]>("SELECT code FROM builder_options WHERE option_group = ?", [group]);
  const taken = new Set(rows.map((row) => row.code));
  let code = base;
  for (let suffix = 2; taken.has(code); suffix += 1) {
    code = `${base}-${suffix}`;
  }
  return code;
};

// Body: { group, name, description?, pricePhp, colors? (palette, filler), colorChoices (flower), imageUrl? (wrap),
// available?, isDefault? }
adminContentRouter.post("/builder-options", async (req, res) => {
  const body = bodyOf(req);
  const group = requireOneOf(body.group, "Option group", BUILDER_GROUPS);
  const fields = parseOptionFields(body, group, null);
  const code = await uniqueCode(group, fields.name);
  const id = `${group}-${code}`;

  if (fields.isDefault) {
    await clearOtherDefaults(group, id);
  }
  await pool.query(
    `INSERT INTO builder_options
       (id, option_group, code, name, description, price_php, colors, color_choices, image_url, is_available, is_default, sort_order)
     SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, COALESCE(MAX(sort_order), 0) + 1 FROM builder_options WHERE option_group = ?`,
    [
      id, group, code, fields.name, fields.description, fields.pricePhp, jsonOrNull(fields.colors), jsonOrNull(fields.colorChoices),
      fields.imageUrl, fields.available, fields.isDefault, group
    ]
  );
  // New flowers and fillers start with no stock; the admin adds it on the Inventory page. A row left over from a
  // deleted option with the same code is linked again, keeping its stock.
  if (STOCKED_GROUPS.includes(group)) {
    await pool.query(
      `INSERT INTO inventory_items (id, kind, builder_option_id, name, description, current_stock, threshold, capacity, unit, sort_order)
       VALUES (?, 'flower', ?, ?, ?, 0, 15, 100, ?, 100)
       ON DUPLICATE KEY UPDATE builder_option_id = VALUES(builder_option_id), name = VALUES(name)`,
      [id, id, fields.name, fields.description, group === "filler" ? "bunches" : "stems"]
    );
  }
  res.status(201).json(await findOption(id));
});

// Body: any of the fields above except group; at least one of them.
adminContentRouter.patch("/builder-options/:id", async (req, res) => {
  const id = requireId(req.params.id, "option");
  const body = bodyOf(req);
  if (Object.keys(body).length === 0) {
    throw new HttpError(400, "Nothing to update");
  }
  const option = await findOption(id);
  const fields = parseOptionFields(body, option.group, option);

  if (!fields.available) {
    await ensureAnotherAvailable(option, "At least one option in this group must stay available");
  }
  if (fields.isDefault && !option.isDefault) {
    await clearOtherDefaults(option.group, id);
  }
  await pool.query(
    `UPDATE builder_options
     SET name = ?, description = ?, price_php = ?, colors = ?, color_choices = ?, image_url = ?, is_available = ?, is_default = ?
     WHERE id = ?`,
    [
      fields.name, fields.description, fields.pricePhp, jsonOrNull(fields.colors), jsonOrNull(fields.colorChoices),
      fields.imageUrl, fields.available, fields.isDefault, id
    ]
  );
  res.json(await findOption(id));
});

// Orders keep their own copies of option names, so removing an option doesn't change past orders.
adminContentRouter.delete("/builder-options/:id", async (req, res) => {
  const option = await findOption(requireId(req.params.id, "option"));
  await ensureAnotherAvailable(option, "This is the last option customers can pick in this group. Add or show another one first.");
  await pool.query("DELETE FROM builder_options WHERE id = ?", [option.id]);
  res.status(204).end();
});

// Raw image body (Content-Type: image/jpeg|png|webp, max 3 MB) -> uploaded to Cloudinary. Used for wrap photos.
adminContentRouter.post("/uploads/builder-image", rawImageBody, async (req, res) => {
  const { image, type } = requireUploadedImage(req);
  const { url } = await uploadImage(image, type, { folder: config.cloudinary.builderOptionFolder });
  res.status(201).json({ url });
});

// AI-generated customizer previews, newest first, so the admin can check them.
adminContentRouter.get("/builder-previews", async (_req, res) => {
  res.json(await listGeneratedPreviews());
});

// The shop's own combination photos (shown instead of an AI preview for Korean wrap + satin ribbon).
adminContentRouter.get("/combination-photos", async (_req, res) => {
  res.json(await listCombinationPhotos());
});

const requireCombinationKey = (value: string | string[]) => {
  if (typeof value !== "string" || !/^[0-9a-f]{40}$/.test(value)) {
    throw new HttpError(400, "Invalid combination photo");
  }
  return value;
};

// Raw image body (JPEG, PNG or WebP, max 3 MB) replaces the photo for this combination. It keeps its Cloudinary id,
// so the old image is overwritten; the new URL carries a new version.
adminContentRouter.put("/combination-photos/:key/image", rawImageBody, async (req, res) => {
  const key = requireCombinationKey(req.params.key);
  const [existing] = await pool.query<RowDataPacket[]>(
    "SELECT combination_key FROM builder_combination_photos WHERE combination_key = ?",
    [key]
  );
  if (existing.length === 0) {
    throw new HttpError(404, "Combination photo not found");
  }
  const { image, type } = requireUploadedImage(req);
  const { url } = await uploadImage(image, type, {
    publicId: `${config.cloudinary.builderCombinationFolder}/${key}`,
    replace: true
  });
  await pool.query("UPDATE builder_combination_photos SET image_url = ?, source_path = ? WHERE combination_key = ?", [
    url,
    "uploaded in the admin",
    key
  ]);
  res.json({ key, image: url });
});

// Changes which bouquet the photo is for (flowers with color and count, fillers, palette). The choices must be ones the
// customizer offers, and a combination can only have one photo.
adminContentRouter.patch("/combination-photos/:key", async (req, res) => {
  const key = requireCombinationKey(req.params.key);
  const body = bodyOf(req);
  const [options, previews] = await Promise.all([loadBuilderOptions(false), loadBuilderPreviews()]);
  const maxFlowers = maxFlowersOf(previews);
  const pick = (group: BuilderGroup, code: unknown, label: string) => {
    const option = options.find((entry) => entry.group === group && entry.code === code);
    if (!option) {
      throw new HttpError(400, `${label} is not available`);
    }
    return option;
  };

  if (!Array.isArray(body.flowers) || body.flowers.length === 0) {
    throw new HttpError(400, "Choose at least one flower");
  }
  // One entry per flower and color; repeats are added together.
  const flowers = new Map<string, { code: string; color: string; quantity: number }>();
  for (const entry of body.flowers) {
    if (!isRecord(entry)) {
      throw new HttpError(400, "Invalid flower selection");
    }
    const flower = pick("flower", entry.code, "Flower");
    const color = flower.colorChoices.find((choice) => choice.name === entry.color);
    if (!color) {
      throw new HttpError(400, `${flower.name} isn't available in that color`);
    }
    const quantity = requireInt(entry.quantity, "Flower quantity", 1, maxFlowers);
    const flowerKey = `${flower.code}|${color.name}`;
    flowers.set(flowerKey, { code: flower.code, color: color.name, quantity: (flowers.get(flowerKey)?.quantity ?? 0) + quantity });
  }
  if ([...flowers.values()].reduce((total, flower) => total + flower.quantity, 0) > maxFlowers) {
    throw new HttpError(400, `A bouquet can have at most ${maxFlowers} flowers`);
  }
  if (body.fillers !== undefined && !Array.isArray(body.fillers)) {
    throw new HttpError(400, "Invalid filler selection");
  }
  const fillers = [...new Set((body.fillers ?? []) as unknown[])].map((code) => pick("filler", code, "Filler").code);
  const selection: CombinationSpec = {
    flowers: [...flowers.values()],
    fillers,
    palette: pick("palette", body.palette, "Color palette").code
  };

  // When another photo already shows for the chosen bouquet, the admin decides: "swap" trades the two photos'
  // bouquets, "replace" removes the other photo. Without a choice the request is refused (409).
  const onConflict = requireOneOf(body.onConflict ?? "none", "Conflict choice", ["none", "swap", "replace"] as const);

  const newKey = combinationKey(selection);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [[current]] = await connection.query<PhotoImageRow[]>(
      "SELECT image_url, source_path FROM builder_combination_photos WHERE combination_key = ? FOR UPDATE",
      [key]
    );
    if (!current) {
      throw new HttpError(404, "Combination photo not found");
    }

    if (newKey === key) {
      await connection.query("UPDATE builder_combination_photos SET selection = ? WHERE combination_key = ?", [JSON.stringify(selection), key]);
    } else {
      const [[other]] = await connection.query<PhotoImageRow[]>(
        "SELECT image_url, source_path FROM builder_combination_photos WHERE combination_key = ? FOR UPDATE",
        [newKey]
      );
      if (!other) {
        await connection.query(
          "UPDATE builder_combination_photos SET combination_key = ?, selection = ? WHERE combination_key = ?",
          [newKey, JSON.stringify(selection), key]
        );
      } else if (onConflict === "replace") {
        await connection.query("DELETE FROM builder_combination_photos WHERE combination_key = ?", [newKey]);
        await connection.query(
          "UPDATE builder_combination_photos SET combination_key = ?, selection = ? WHERE combination_key = ?",
          [newKey, JSON.stringify(selection), key]
        );
      } else if (onConflict === "swap") {
        // Each bouquet keeps its row; the two images (and where they came from) trade places.
        const swap = "UPDATE builder_combination_photos SET image_url = ?, source_path = ? WHERE combination_key = ?";
        await connection.query(swap, [other.image_url, other.source_path, key]);
        await connection.query(swap, [current.image_url, current.source_path, newKey]);
      } else {
        throw new HttpError(409, "Another photo already shows for that bouquet.");
      }
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
  res.json({ key: newKey, selection });
});

// Removes the photo; customers choosing this combination get a generated preview again.
adminContentRouter.delete("/combination-photos/:key", async (req, res) => {
  const key = requireCombinationKey(req.params.key);
  const [result] = await pool.query<ResultSetHeader>("DELETE FROM builder_combination_photos WHERE combination_key = ?", [key]);
  if (result.affectedRows === 0) {
    throw new HttpError(404, "Combination photo not found");
  }
  res.status(204).end();
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
