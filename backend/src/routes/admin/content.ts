import { Router } from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { loadBuilderOptions } from "../../db/builder.js";
import { pool } from "../../db/pool.js";
import { SITE_CONTENT_FIELDS, SITE_CONTENT_KEYS, saveSiteContent, type SiteContent } from "../../db/siteContent.js";
import { HttpError } from "../../middleware/errorHandler.js";
import { bodyOf, requireId, requireString } from "../../utils/validate.js";

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

adminContentRouter.patch("/builder-options/:id", async (req, res) => {
  const id = requireId(req.params.id, "option");
  const available = bodyOf(req).available;
  if (typeof available !== "boolean") {
    throw new HttpError(400, "available must be true or false");
  }

  if (!available) {
    // The customizer needs at least one choice in every group.
    const [[row]] = await pool.query<AvailableCountRow[]>(
      `SELECT COUNT(*) AS available_in_group FROM builder_options
       WHERE is_available = TRUE AND id <> ?
         AND option_group = (SELECT option_group FROM (SELECT option_group FROM builder_options WHERE id = ?) AS target)`,
      [id, id]
    );
    if (Number(row.available_in_group) === 0) {
      throw new HttpError(409, "At least one option in this group must stay available");
    }
  }

  const [result] = await pool.query<ResultSetHeader>("UPDATE builder_options SET is_available = ? WHERE id = ?", [available, id]);
  if (result.affectedRows === 0) {
    throw new HttpError(404, "Builder option not found");
  }
  const option = (await loadBuilderOptions(false)).find((entry) => entry.id === id);
  res.json(option);
});
