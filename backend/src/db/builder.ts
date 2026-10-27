import { createHash } from "node:crypto";
import type { RowDataPacket } from "mysql2";
import { HttpError } from "../middleware/errorHandler.js";
import { isRecord, requireInt } from "../utils/validate.js";
import { pool } from "./pool.js";

export const BUILDER_GROUPS = ["size", "flower", "filler", "palette", "wrap", "ribbon"] as const;
export type BuilderGroup = (typeof BUILDER_GROUPS)[number];
/** Groups whose options use up stock: each one is linked to an inventory row. */
export const STOCKED_GROUPS: readonly BuilderGroup[] = ["flower", "filler"];

interface BuilderOptionRow extends RowDataPacket {
  id: string;
  option_group: BuilderGroup;
  code: string;
  name: string;
  description: string;
  price_php: number;
  colors: string[] | null;
  color_choices: FlowerColor[] | null;
  image_url: string | null;
  is_available: number;
  is_default: number;
  inventory_item_id: string | null;
  stock: number | null;
  stock_unit: string | null;
}

/** A color a flower can be ordered in; every flower has exactly one default. */
export interface FlowerColor {
  name: string;
  hex: string;
  isDefault: boolean;
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
  colorChoices: FlowerColor[];
  imageUrl: string | null;
  available: boolean;
  isDefault: boolean;
  /** Linked inventory row (flowers and fillers); null means the option isn't stock-limited. */
  inventoryItemId: string | null;
  stock: number | null;
  stockUnit: string | null;
}

export const loadBuilderOptions = async (availableOnly: boolean): Promise<BuilderOption[]> => {
  const [rows] = await pool.query<BuilderOptionRow[]>(
    `SELECT b.id, b.option_group, b.code, b.name, b.description, b.price_php, b.colors, b.color_choices, b.image_url,
            b.is_available, b.is_default, i.id AS inventory_item_id, i.current_stock AS stock, i.unit AS stock_unit
     FROM builder_options b
     LEFT JOIN inventory_items i ON i.builder_option_id = b.id
     ${availableOnly ? "WHERE b.is_available = TRUE" : ""}
     ORDER BY FIELD(b.option_group, 'size', 'flower', 'filler', 'palette', 'wrap', 'ribbon'), b.sort_order`
  );
  return rows.map((row) => ({
    id: row.id,
    group: row.option_group,
    code: row.code,
    name: row.name,
    description: row.description,
    pricePhp: row.price_php,
    colors: row.colors ?? [],
    colorChoices: row.color_choices ?? [],
    imageUrl: row.image_url,
    available: Boolean(row.is_available),
    isDefault: Boolean(row.is_default),
    inventoryItemId: row.inventory_item_id,
    stock: row.stock,
    stockUnit: row.stock_unit
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
  flowers: Array<{ option: BuilderOption; color: FlowerColor; quantity: number }>;
  fillers: BuilderOption[];
}

// A flower's default color; flowers saved before colors existed fall back to their swatch.
export const defaultFlowerColor = (flower: BuilderOption): FlowerColor =>
  flower.colorChoices.find((color) => color.isDefault)
    ?? flower.colorChoices[0]
    ?? { name: "Natural", hex: flower.colors[0] ?? "#f2b8c6", isDefault: true };

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
  // Keyed by flower and color, so the same flower may appear in more than one color.
  const flowerCounts = new Map<string, { option: BuilderOption; color: FlowerColor; quantity: number }>();
  for (const entry of custom.flowers) {
    if (!isRecord(entry)) {
      throw new HttpError(400, "Invalid flower selection");
    }
    const flower = pick("flower", entry.code, "Flower");
    const count = requireInt(entry.quantity, "Flower quantity", 1, maxFlowers);
    // Carts saved before flower colors existed don't send one; they get the default.
    const color = entry.color === undefined
      ? defaultFlowerColor(flower)
      : flower.colorChoices.find((choice) => choice.name === entry.color);
    if (!color) {
      throw new HttpError(400, `${flower.name} isn't available in that color`);
    }
    const key = `${flower.code}|${color.name}`;
    const existing = flowerCounts.get(key);
    flowerCounts.set(key, { option: flower, color, quantity: (existing?.quantity ?? 0) + count });
  }
  const totalFlowers = [...flowerCounts.values()].reduce((total, flower) => total + flower.quantity, 0);
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
    flowers: [...flowerCounts.values()],
    fillers
  };
};

// Size only changes the price, so it isn't part of the key: the same stems, fillers, colors and wrapping
// always reuse one image.
export const selectionKey = (selection: BouquetSelection) => {
  const canonical = {
    flowers: selection.flowers
      .map(({ option, color, quantity }) => `${option.code}:${color.name.toLowerCase()}:${quantity}`)
      .sort(),
    fillers: selection.fillers.map((filler) => filler.code).sort(),
    palette: selection.palette.code,
    wrap: selection.wrap.code,
    ribbon: selection.ribbon.code
  };
  return createHash("sha1").update(JSON.stringify(canonical)).digest("hex");
};

export interface GeneratedPreviewSelection {
  // color is missing on previews generated before flower colors existed.
  flowers: Array<{ name: string; quantity: number; color?: string }>;
  fillers: string[];
  palette: string;
  wrap: string;
  ribbon: string;
}

export const describeSelection = (selection: BouquetSelection): GeneratedPreviewSelection => ({
  flowers: selection.flowers.map(({ option, color, quantity }) => ({ name: option.name, quantity, color: color.name })),
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
