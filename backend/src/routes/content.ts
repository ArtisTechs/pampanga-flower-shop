import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import { pool } from "../db/pool.js";
import { getSiteContent } from "../db/siteContent.js";

interface CardRow extends RowDataPacket {
  id: string;
  route: string;
  collection_type: "occasions" | "flowers";
  card_title: string;
  card_subtitle: string;
  card_image_path: string;
}

interface FeatureRow extends RowDataPacket {
  id: string;
  icon: string;
  title: string;
  description: string;
}

interface PerkRow extends RowDataPacket {
  id: string;
  icon: string;
  label: string;
}

interface StepRow extends RowDataPacket {
  id: string;
  icon: "flowers" | "palette" | "check";
  description: string;
}

interface TestimonialRow extends RowDataPacket {
  id: string;
  author_name: string;
  quote: string;
  rating: number;
}

export const contentRouter = Router();

contentRouter.get("/site-content", async (_req, res) => {
  res.json(await getSiteContent());
});

// Home page sections. Image paths are relative to the frontend's public folder.
contentRouter.get("/home", async (_req, res) => {
  const [[cards], [features], [testimonials], [perks], [steps]] = await Promise.all([
    pool.query<CardRow[]>(
      `SELECT id, route, collection_type, card_title, card_subtitle, card_image_path
       FROM categories
       WHERE show_on_home = TRUE AND card_title IS NOT NULL
       ORDER BY sort_order, title`
    ),
    pool.query<FeatureRow[]>("SELECT id, icon, title, description FROM home_features ORDER BY sort_order"),
    pool.query<TestimonialRow[]>(
      "SELECT id, author_name, quote, rating FROM testimonials WHERE is_published = TRUE ORDER BY sort_order"
    ),
    pool.query<PerkRow[]>("SELECT id, icon, label FROM home_perks ORDER BY sort_order"),
    pool.query<StepRow[]>("SELECT id, icon, description FROM home_steps ORDER BY sort_order")
  ]);

  res.json({
    occasionCards: cards
      .filter((card) => card.collection_type === "occasions")
      .map((card) => ({
        id: card.id,
        title: card.card_title,
        subtitle: card.card_subtitle,
        image: card.card_image_path,
        route: card.route
      })),
    flowerTypeCards: cards
      .filter((card) => card.collection_type === "flowers")
      .map((card) => ({
        id: card.id,
        name: card.card_title,
        label: card.card_subtitle,
        image: card.card_image_path,
        route: card.route
      })),
    features,
    perks,
    steps,
    testimonials: testimonials.map((row) => ({ id: row.id, name: row.author_name, quote: row.quote, rating: row.rating }))
  });
});
