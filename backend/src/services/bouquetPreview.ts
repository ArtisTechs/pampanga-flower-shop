import { config } from "../config.js";
import {
  describeSelection,
  findGeneratedPreview,
  saveGeneratedPreview,
  selectionKey,
  type BouquetSelection,
  type BuilderOption,
  type BuilderPreview
} from "../db/builder.js";
import { HttpError } from "../middleware/errorHandler.js";
import { isCloudinaryImageUrl, uploadImage } from "./cloudinary.js";
import { inspectImage, isGeminiConfigured } from "./gemini.js";
import { generateImage, isImageGenerationConfigured, supportsReferenceImages } from "./imageGeneration.js";

interface InlineImage {
  mimeType: string;
  data: Buffer;
}

// Image models follow plain sentences with spelled-out counts and named colors far better than lists or
// hex codes, so every choice is turned into words. Unknown codes fall back to the option's own name.

// Wrapping paper and ribbon colors that go with each palette.
const PALETTE_PAPER_COLORS: Record<string, string> = {
  red: "white",
  blush: "pale pink",
  ivory: "cream",
  purple: "pale lavender",
  blue: "light blue",
  black: "matte black"
};

const PALETTE_RIBBON_COLORS: Record<string, string> = {
  red: "red",
  blush: "peach",
  ivory: "champagne",
  purple: "purple",
  blue: "navy blue",
  black: "black"
};

// Each flower only in colors it is really sold in at Philippine flower shops (e.g. Dangwa). When a flower
// doesn't come in the palette's color, it keeps its nearest real color and the paper and ribbon carry the palette.
interface FlowerLook {
  singular: string;
  plural: string;
  detail: string;
  colors: Record<string, string>;
}

const FLOWER_LOOKS: Record<string, FlowerLook> = {
  roses: {
    singular: "{color} rose",
    plural: "{color} roses",
    detail: "",
    colors: {
      red: "deep red",
      blush: "soft blush pink",
      ivory: "creamy ivory white",
      purple: "lavender",
      blue: "dyed royal blue",
      black: "very dark burgundy, almost black,"
    }
  },
  carnations: {
    singular: "{color} carnation",
    plural: "{color} carnations",
    detail: " with ruffled petals",
    colors: {
      red: "red",
      blush: "light pink",
      ivory: "white",
      purple: "purple",
      blue: "dyed light blue",
      black: "dark burgundy"
    }
  },
  // Stargazers are naturally deep pink with white edges; white oriental lilies stand in where pink clashes.
  "stargazer-lilies": {
    singular: "{color} lily",
    plural: "{color} lilies",
    detail: " with large open star-shaped petals",
    colors: {
      red: "deep pink stargazer",
      blush: "pink stargazer",
      ivory: "pure white oriental",
      purple: "deep pink stargazer",
      blue: "pure white oriental",
      black: "pure white oriental"
    }
  },
  gerberas: {
    singular: "{color} gerbera daisy",
    plural: "{color} gerbera daisies",
    detail: "",
    colors: {
      red: "red",
      blush: "light pink",
      ivory: "white",
      purple: "magenta",
      blue: "white",
      black: "deep red"
    }
  },
  // Sunflowers only come in yellow.
  sunflowers: {
    singular: "{color} sunflower",
    plural: "{color} sunflowers",
    detail: " with dark brown centers",
    colors: {}
  }
};
const DEFAULT_FLOWER_COLORS: Record<string, string> = { sunflowers: "golden yellow" };

const ASTER_COLORS: Record<string, string> = {
  red: "white",
  blush: "pink",
  ivory: "white",
  purple: "purple",
  blue: "purple",
  black: "white"
};

const FILLER_WORDS: Record<string, string> = {
  asters: "small {aster} asters",
  yucca: "three tall green yucca leaves rising behind the flowers",
  "babys-breath": "white baby's breath",
  goldenrod: "sprays of yellow goldenrod",
  "assorted-mums": "small button mums in natural white, yellow and green"
};

const WRAP_WORDS: Record<string, string> = {
  korean: "{paper} Korean-style wrapping paper in overlapping pointed layers",
  round: "{paper} wrapping paper shaped into a neat round dome with a circular collar"
};

const RIBBON_WORDS: Record<string, string> = {
  satin: "a {ribbon} satin ribbon bow",
  velvet: "a {ribbon} velvet ribbon bow",
  twine: "a natural jute twine bow"
};

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const countWord = (count: number) => NUMBER_WORDS[count] ?? String(count);

const listText = (items: string[]) =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

// "two deep red roses", "one golden yellow sunflower with dark brown centers"
const flowerPhrase = (selection: BouquetSelection, option: BuilderOption, quantity: number) => {
  const { palette } = selection;
  const look = FLOWER_LOOKS[option.code];
  if (!look) {
    return `${countWord(quantity)} ${palette.name.toLowerCase()} ${option.name.toLowerCase()}`;
  }
  const color = look.colors[palette.code] ?? DEFAULT_FLOWER_COLORS[option.code] ?? palette.name.toLowerCase();
  return `${countWord(quantity)} ${(quantity === 1 ? look.singular : look.plural).replace("{color}", color)}${look.detail}`;
};

const fillerPhrase = (selection: BouquetSelection, filler: BuilderOption) =>
  (FILLER_WORDS[filler.code] ?? filler.name.toLowerCase()).replace("{aster}", ASTER_COLORS[selection.palette.code] ?? "white");

const wrapPhrase = (selection: BouquetSelection, paperColor: string) =>
  (WRAP_WORDS[selection.wrap.code] ?? `${selection.wrap.name.toLowerCase()} wrapping`).replace("{paper}", paperColor);

// Where each flower sits, by total flower count; larger bouquets are described by counts only.
const FLOWER_SLOTS: Record<number, string[]> = {
  1: ["in the center"],
  2: ["on the left", "on the right"],
  3: ["on the left", "in the center", "on the right"],
  4: ["at the back left", "at the back right", "at the front left", "at the front right"],
  5: ["at the back left", "at the back center", "at the back right", "at the front left", "at the front right"],
  6: ["at the back left", "at the back center", "at the back right", "at the front left", "at the front center", "at the front right"]
};

// Patterned on the shop's existing customizer photos: a single wrapped bouquet, centered, front view,
// on a plain white studio background with a soft shadow.
export const buildPreviewPrompt = (selection: BouquetSelection, hasReference: boolean) => {
  const { palette, ribbon } = selection;
  const paperColor = PALETTE_PAPER_COLORS[palette.code] ?? "soft-colored";
  const ribbonColor = PALETTE_RIBBON_COLORS[palette.code] ?? palette.name.toLowerCase();

  const flowerText = listText(
    selection.flowers.map(({ option, quantity }) => flowerPhrase(selection, option, quantity))
  );
  const totalStems = selection.flowers.reduce((total, flower) => total + flower.quantity, 0);
  const fillerText = selection.fillers.length > 0
    ? `, plus ${listText(selection.fillers.map((filler) => fillerPhrase(selection, filler)))}`
    : ", with only a few small green leaves and no filler flowers";
  const wrapText = wrapPhrase(selection, paperColor);
  const ribbonText = (RIBBON_WORDS[ribbon.code] ?? `a ${ribbon.name.toLowerCase()} bow`).replace("{ribbon}", ribbonColor);

  // Image models keep counts far better when each flower has its own spot.
  const slots = FLOWER_SLOTS[totalStems];
  const stems = selection.flowers.flatMap(({ option, quantity }) => Array.from({ length: quantity }, () => option));
  const layoutText = slots
    ? `Arrangement: ${listText(stems.map((option, index) => `${flowerPhrase(selection, option, 1)} ${slots[index]}`))}.`
    : null;

  return [
    hasReference
      ? "Match the attached shop photo's style (camera angle, framing, white background, shadow, lighting), but not its flowers, colors, paper or ribbon."
      : null,
    `Photorealistic studio product photo of a florist bouquet with exactly ${flowerText}${fillerText}.`,
    layoutText,
    `It has exactly ${countWord(totalStems)} main ${totalStems === 1 ? "flower" : "flowers"} in total, each clearly visible, and no other kinds of flowers.`,
    `Wrapped in ${wrapText}, tied around the stems with ${ribbonText}.`,
    "Centered, front view, the whole bouquet in frame with white space around it, on a pure white background with a soft shadow.",
    "Every flower is a real variety in a true-to-life color, exactly as sold by florists in the Philippines.",
    "Soft studio lighting, sharp focus, real fresh flowers with natural textures. No text, no hands, no vase."
  ]
    .filter((line) => line !== null)
    .join("\n");
};

interface PreviewCheck {
  flowers: Array<{ name: string; countSeen: number; colorMatches: boolean }>;
  otherMainFlowers: string[];
  fillersMissing: string[];
  wrapMatches: boolean;
  realistic: boolean;
}

// Image models still miscount at times; a vision model compares each new image with the order first.
const buildCheckPrompt = (selection: BouquetSelection) => {
  const paperColor = PALETTE_PAPER_COLORS[selection.palette.code] ?? "soft-colored";
  return [
    "You are checking a product photo of a florist bouquet against the customer's order before it is shown to them.",
    "Order:",
    ...selection.flowers.map(({ option, quantity }) => `- ${option.name}: ${flowerPhrase(selection, option, quantity)}`),
    selection.fillers.length > 0
      ? `- Fillers: ${listText(selection.fillers.map((filler) => fillerPhrase(selection, filler)))}`
      : "- Fillers: none",
    `- Wrap: ${wrapPhrase(selection, paperColor)}`,
    "Count each listed main flower one by one, including partly hidden ones, and say whether their color matches the order.",
    "List any other kinds of main flowers you see; fillers, leaves and greenery don't count.",
    "List the ordered fillers you can't see. Say whether the wrap style matches, and whether every flower looks like a real flower.",
    "Colors sold by florists count as real, including dyed blue flowers and very dark burgundy flowers; only fantasy colors (such as a pink sunflower) or fake-looking flowers are unrealistic."
  ].join("\n");
};

const checkSchema = (selection: BouquetSelection) => ({
  type: "OBJECT",
  properties: {
    flowers: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING", enum: selection.flowers.map(({ option }) => option.name) },
          countSeen: { type: "INTEGER" },
          colorMatches: { type: "BOOLEAN" }
        },
        required: ["name", "countSeen", "colorMatches"]
      }
    },
    otherMainFlowers: { type: "ARRAY", items: { type: "STRING" } },
    fillersMissing: { type: "ARRAY", items: { type: "STRING" } },
    wrapMatches: { type: "BOOLEAN" },
    realistic: { type: "BOOLEAN" }
  },
  required: ["flowers", "otherMainFlowers", "fillersMissing", "wrapMatches", "realistic"]
});

const isPreviewCheck = (value: unknown): value is PreviewCheck =>
  typeof value === "object" && value !== null && Array.isArray((value as PreviewCheck).flowers);

// What's wrong with the image ([] when it matches), or "unchecked" when no model could check it (quota, outage).
const findPreviewProblems = async (image: InlineImage, selection: BouquetSelection): Promise<string[] | "unchecked"> => {
  const result = await inspectImage(buildCheckPrompt(selection), image, checkSchema(selection));
  if (!isPreviewCheck(result)) {
    return "unchecked";
  }

  const problems: string[] = [];
  for (const { option, quantity } of selection.flowers) {
    const seen = result.flowers.find((flower) => flower.name === option.name);
    // Big overlapping bunches are hard to count exactly, even for a person looking at the photo.
    const tolerance = quantity > 6 ? 1 : 0;
    if (!seen || Math.abs(seen.countSeen - quantity) > tolerance) {
      problems.push(`${option.name}: expected ${quantity}, saw ${seen?.countSeen ?? 0}`);
    } else if (!seen.colorMatches) {
      problems.push(`${option.name}: wrong color`);
    }
  }
  if (result.otherMainFlowers.length > 0) {
    problems.push(`unexpected flowers: ${result.otherMainFlowers.join(", ")}`);
  }
  if (result.fillersMissing.length > 0) {
    problems.push(`missing fillers: ${result.fillersMissing.join(", ")}`);
  }
  if (!result.wrapMatches) {
    problems.push("wrong wrap style");
  }
  if (!result.realistic) {
    problems.push("unrealistic flowers");
  }
  return problems;
};

// One stock photo as a style reference: same stem count and wrap if possible.
const pickReference = (selection: BouquetSelection, previews: BuilderPreview[]) => {
  const totalStems = selection.flowers.reduce((total, flower) => total + flower.quantity, 0);
  return [...previews]
    .map((preview) => ({
      preview,
      score: (preview.wraps.includes(selection.wrap.code) ? 10 : 0) - Math.abs(preview.flowerCount - totalStems) * 3
    }))
    .sort((first, second) => second.score - first.score)[0]?.preview;
};

const fetchReference = async (imageUrl: string) => {
  if (!isCloudinaryImageUrl(imageUrl)) {
    return null;
  }
  try {
    // A small JPEG keeps the request light; the reference is only for style.
    const response = await fetch(imageUrl.replace("/image/upload/", "/image/upload/f_jpg,q_80,w_768/"), {
      signal: AbortSignal.timeout(15_000)
    });
    if (!response.ok) {
      return null;
    }
    return { mimeType: "image/jpeg", data: Buffer.from(await response.arrayBuffer()) };
  } catch (error) {
    console.warn("Could not load the preview style reference:", error);
    return null;
  }
};

// Per-customer limit on new generations (cache hits are free). In memory, so it resets on restart.
const recentGenerations = new Map<string, number[]>();
const HOUR_MS = 60 * 60 * 1000;

const reserveGeneration = (userId: string) => {
  const now = Date.now();
  const recent = (recentGenerations.get(userId) ?? []).filter((time) => now - time < HOUR_MS);
  if (recent.length >= config.imageGeneration.generationsPerHour) {
    throw new HttpError(429, "You've made a lot of new previews. Please try again in a little while.");
  }
  recentGenerations.set(userId, [...recent, now]);
};

// Two customers asking for the same new selection at once share one generation.
const inFlight = new Map<string, Promise<string>>();

const generateAndStore = async (key: string, selection: BouquetSelection, previews: BuilderPreview[], userId: string) => {
  // Only Gemini can follow a reference photo; the text-only model relies on the prompt's style description.
  const referenceUrl = supportsReferenceImages ? pickReference(selection, previews)?.image : undefined;
  const reference = referenceUrl ? await fetchReference(referenceUrl) : null;
  const prompt = buildPreviewPrompt(selection, reference !== null);

  // With Gemini set up, only an image that passes the check is cached; after the last failed try the customizer
  // shows the stock photo. An image no model could check is shown once but not cached, so a later visit retries.
  const checksImages = isGeminiConfigured();
  // Generator errors and timeouts are retried too, until the tries or the time budget run out.
  const { maxAttempts, timeBudgetMs } = config.imageGeneration;
  const startedAt = Date.now();
  let image: InlineImage | null = null;
  let isVerified = !checksImages;
  for (let attempt = 1; attempt <= maxAttempts && !image && Date.now() - startedAt < timeBudgetMs; attempt += 1) {
    let candidate: InlineImage;
    try {
      candidate = await generateImage(prompt, reference ? [reference] : []);
    } catch {
      // The provider has already logged why.
      continue;
    }
    const problems = checksImages ? await findPreviewProblems(candidate, selection) : [];
    if (problems === "unchecked") {
      image = candidate;
    } else if (problems.length === 0) {
      image = candidate;
      isVerified = true;
    } else {
      console.warn(`Bouquet preview ${key} attempt ${attempt} rejected: ${problems.join("; ")}`);
    }
  }
  if (!image) {
    throw new HttpError(502, "We couldn't create an accurate preview for this bouquet.");
  }
  // replace: a leftover asset under this key was removed from the cache (e.g. by an admin) or is unchecked.
  const { url } = await uploadImage(image.data, image.mimeType, {
    publicId: `${config.cloudinary.builderPreviewFolder}/${key}`,
    replace: true
  });
  if (isVerified) {
    await saveGeneratedPreview(key, describeSelection(selection), url, userId);
  } else {
    console.warn(`Bouquet preview ${key} couldn't be checked; shown without caching`);
  }
  return url;
};

// The cached image for this exact selection, generating (and caching) it only when there is none yet.
export const getOrCreatePreview = async (selection: BouquetSelection, previews: BuilderPreview[], userId: string) => {
  const key = selectionKey(selection);
  const cached = await findGeneratedPreview(key);
  if (cached) {
    return { image: cached, generated: false };
  }
  if (!isImageGenerationConfigured()) {
    throw new HttpError(503, "Bouquet previews can't be generated right now");
  }

  let pending = inFlight.get(key);
  if (!pending) {
    reserveGeneration(userId);
    pending = generateAndStore(key, selection, previews, userId).finally(() => inFlight.delete(key));
    inFlight.set(key, pending);
  }
  return { image: await pending, generated: true };
};
