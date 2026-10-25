import { createHash } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { HttpError } from "../middleware/errorHandler.js";
import { isRecord, requireInt } from "../utils/validate.js";
import { pool } from "./pool.js";

export const BUILDER_GROUPS = ["size", "flower", "filler", "palette", "wrap", "ribbon"] as const;
export type BuilderGroup = (typeof BUILDER_GROUPS)[number];

interface BuilderOptionRow extends RowDataPacket {
  id: string;
  option_group: BuilderGroup;
  code: string;
  name: string;
  description: string;
  price_php: number;
  colors: string[] | null;
  is_available: number;
  is_default: number;
}

interface GeneratedPreviewRow extends RowDataPacket {
  selection_key: string;
  selection: GeneratedPreviewSelection;
  image_url: string;
  created_at: Date;
}

interface BuilderPreviewRow extends RowDataPacket {
  flower_count: number;
  image_path: string;
  flower_codes: string[];
  palette_codes: string[];
  wrap_codes: string[];
  ribbon_codes: string[];
}

export interface BuilderOption {
  id: string;
  group: BuilderGroup;
  code: string;
  name: string;
  description: string;
  pricePhp: number;
  colors: string[];
  available: boolean;
  isDefault: boolean;
}

export const loadBuilderOptions = async (availableOnly: boolean): Promise<BuilderOption[]> => {
  const [rows] = await pool.query<BuilderOptionRow[]>(
    `SELECT id, option_group, code, name, description, price_php, colors, is_available, is_default
     FROM builder_options
     ${availableOnly ? "WHERE is_available = TRUE" : ""}
     ORDER BY FIELD(option_group, 'size', 'flower', 'filler', 'palette', 'wrap', 'ribbon'), sort_order`
  );
  return rows.map((row) => ({
    id: row.id,
    group: row.option_group,
    code: row.code,
    name: row.name,
    description: row.description,
    pricePhp: row.price_php,
    colors: row.colors ?? [],
    available: Boolean(row.is_available),
    isDefault: Boolean(row.is_default)
  }));
};

export const loadBuilderPreviews = async () => {
  const [rows] = await pool.query<BuilderPreviewRow[]>(
    `SELECT flower_count, image_path, flower_codes, palette_codes, wrap_codes, ribbon_codes
     FROM builder_previews
     ORDER BY flower_count, sort_order`
  );
  return rows.map((row) => ({
    flowerCount: row.flower_count,
    image: row.image_path,
    flowers: row.flower_codes,
    palettes: row.palette_codes,
    wraps: row.wrap_codes,
    ribbons: row.ribbon_codes
  }));
};

export type BuilderPreview = Awaited<ReturnType<typeof loadBuilderPreviews>>[number];

// The largest stock preview sets the stem limit for a bouquet.
export const maxFlowersOf = (previews: BuilderPreview[]) => Math.max(1, ...previews.map((preview) => preview.flowerCount));

export interface BouquetSelection {
  size: BuilderOption;
  palette: BuilderOption;
  wrap: BuilderOption;
  ribbon: BuilderOption;
  flowers: Array<{ option: BuilderOption; quantity: number }>;
  fillers: BuilderOption[];
}

// Validates a customer's builder choices against the available options (shared by previews and orders).
export const parseBouquetSelection = (
  custom: Record<string, unknown>,
  options: BuilderOption[],
  maxFlowers: number
): BouquetSelection => {
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

  // Fillers are optional; older carts don't send them at all.
  const fillerCodes = custom.fillers === undefined ? [] : custom.fillers;
  if (!Array.isArray(fillerCodes)) {
    throw new HttpError(400, "Invalid filler selection");
  }
  const fillers = [...new Set(fillerCodes)].map((code) => pick("filler", code, "Filler"));

  return {
    size,
    palette,
    wrap,
    ribbon,
    flowers: [...flowerCounts].map(([code, quantity]) => ({
      option: options.find((entry) => entry.group === "flower" && entry.code === code)!,
      quantity
    })),
    fillers
  };
};

// Size only changes the price, so it isn't part of the key: the same stems, fillers, colors and wrapping
// always reuse one image.
export const selectionKey = (selection: BouquetSelection) => {
  const canonical = {
    flowers: selection.flowers
      .map(({ option, quantity }) => `${option.code}:${quantity}`)
      .sort(),
    fillers: selection.fillers.map((filler) => filler.code).sort(),
    palette: selection.palette.code,
    wrap: selection.wrap.code,
    ribbon: selection.ribbon.code
  };
  return createHash("sha1").update(JSON.stringify(canonical)).digest("hex");
};

export interface GeneratedPreviewSelection {
  flowers: Array<{ name: string; quantity: number }>;
  fillers: string[];
  palette: string;
  wrap: string;
  ribbon: string;
}

export const describeSelection = (selection: BouquetSelection): GeneratedPreviewSelection => ({
  flowers: selection.flowers.map(({ option, quantity }) => ({ name: option.name, quantity })),
  fillers: selection.fillers.map((filler) => filler.name),
  palette: selection.palette.name,
  wrap: selection.wrap.name,
  ribbon: selection.ribbon.name
});

export const findGeneratedPreview = async (key: string) => {
  const [rows] = await pool.query<GeneratedPreviewRow[]>(
    "SELECT image_url FROM builder_generated_previews WHERE selection_key = ?",
    [key]
  );
  return rows[0]?.image_url ?? null;
};

export const saveGeneratedPreview = async (
  key: string,
  selection: GeneratedPreviewSelection,
  imageUrl: string,
  userId: string | null
) => {
  await pool.query(
    `INSERT INTO builder_generated_previews (selection_key, selection, image_url, created_by)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE image_url = VALUES(image_url)`,
    [key, JSON.stringify(selection), imageUrl, userId]
  );
};

export const listGeneratedPreviews = async () => {
  const [rows] = await pool.query<GeneratedPreviewRow[]>(
    `SELECT selection_key, selection, image_url, created_at
     FROM builder_generated_previews
     ORDER BY created_at DESC
     LIMIT 200`
  );
  return rows.map((row) => ({
    key: row.selection_key,
    selection: row.selection,
    image: row.image_url,
    createdAt: row.created_at.toISOString()
  }));
};
