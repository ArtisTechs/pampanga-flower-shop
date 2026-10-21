import { Router } from "express";
import { loadBuilderOptions, loadBuilderPreviews, type BuilderGroup, type BuilderOption } from "../db/builder.js";

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
    maxFlowers: Math.max(1, ...previews.map((preview) => preview.flowerCount))
  });
});
