import type { RowDataPacket } from "mysql2";
import { pool } from "./pool.js";

// Admin-editable keys in site_settings; shape matches SiteContent in frontend/src/types/shop.ts.
// Headings may wrap words in *asterisks* to highlight them.
export const SITE_CONTENT_FIELDS = {
  bannerTitle: 120,
  bannerSubtitle: 300,
  shopName: 120,
  operatingHours: 120,
  fullAddress: 300,
  aboutText: 1000,
  heroTagline: 160,
  heroSecondaryCta: 80,
  occasionsHeading: 120,
  flowerTypesHeading: 120,
  featuresHeading: 120,
  philosophyBannerTitle: 120,
  philosophyBannerText: 300,
  philosophyHeading: 120,
  howItWorksHeading: 120,
  howItWorksSubtitle: 200,
  reviewsHeading: 120,
  reviewsSubtitle: 200,
  pickupMethod: 120,
  paymentMethod: 120
} as const;

export type SiteContentKey = keyof typeof SITE_CONTENT_FIELDS;
export type SiteContent = Record<SiteContentKey, string>;

export const SITE_CONTENT_KEYS = Object.keys(SITE_CONTENT_FIELDS) as SiteContentKey[];

interface SettingRow extends RowDataPacket {
  setting_key: string;
  setting_value: string;
}

export const getSiteContent = async (): Promise<SiteContent> => {
  const [rows] = await pool.query<SettingRow[]>(
    "SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN (?)",
    [SITE_CONTENT_KEYS]
  );
  const values = new Map(rows.map((row) => [row.setting_key, row.setting_value]));
  return Object.fromEntries(SITE_CONTENT_KEYS.map((key) => [key, values.get(key) ?? ""])) as SiteContent;
};

export const saveSiteContent = async (content: SiteContent) => {
  const rows = SITE_CONTENT_KEYS.map((key) => [key, content[key]]);
  await pool.query(
    "INSERT INTO site_settings (setting_key, setting_value) VALUES ? ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)",
    [rows]
  );
};
