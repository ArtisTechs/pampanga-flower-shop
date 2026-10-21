import type { RowDataPacket } from "mysql2";
import { pool } from "./pool.js";

export const BUILDER_GROUPS = ["size", "flower", "palette", "wrap", "ribbon"] as const;
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
     ORDER BY FIELD(option_group, 'size', 'flower', 'palette', 'wrap', 'ribbon'), sort_order`
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
