import { Router } from "express";
import {
  loadBuilderOptions,
  loadBuilderPreviews,
  maxFlowersOf,
  parseBouquetSelection,
  type BuilderGroup,
  type BuilderOption
} from "../db/builder.js";
import { currentUser, requireAuth } from "../middleware/auth.js";
import { getOrCreatePreview } from "../services/bouquetPreview.js";
import { bodyOf } from "../utils/validate.js";

const toClientOption = ({ code, name, description, pricePhp, colors }: BuilderOption) => ({
  id: code,
  name,
  description,
  pricePhp,
  colors
});

export const builderRouter = Router();

// Options the customer customizer can offer right now (unavailable ones are hidden).
builderRouter.get("/builder", async (_req, res) => {
  const [options, previews] = await Promise.all([loadBuilderOptions(true), loadBuilderPreviews()]);
  const byGroup = (group: BuilderGroup) => options.filter((option) => option.group === group).map(toClientOption);

  res.json({
    sizes: byGroup("size"),
    flowers: byGroup("flower"),
    fillers: byGroup("filler"),
    palettes: byGroup("palette"),
    wraps: byGroup("wrap"),
    ribbons: byGroup("ribbon"),
    previews,
    // Starting choice per group: the default option if it's available, otherwise the first one.
    defaults: Object.fromEntries(
      (["size", "palette", "wrap", "ribbon"] as const).map((group) => {
        const groupOptions = options.filter((option) => option.group === group);
        return [group, (groupOptions.find((option) => option.isDefault) ?? groupOptions[0])?.code ?? ""];
      })
    ),
    maxFlowers: maxFlowersOf(previews)
  });
});

// Preview image for the customer's exact selection: reused from the cache, or generated once with AI.
// 503 when generation isn't configured; the customizer then falls back to the closest stock preview.
builderRouter.post("/builder/preview", requireAuth, async (req, res) => {
  const [options, previews] = await Promise.all([loadBuilderOptions(true), loadBuilderPreviews()]);
  const selection = parseBouquetSelection(bodyOf(req), options, maxFlowersOf(previews));
  res.json(await getOrCreatePreview(selection, previews, currentUser(res).id));
});
