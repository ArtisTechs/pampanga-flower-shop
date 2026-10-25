import { config } from "../config.js";
import {
  describeSelection,
  findGeneratedPreview,
  saveGeneratedPreview,
  selectionKey,
  type BouquetSelection,
  type BuilderPreview
} from "../db/builder.js";
import { HttpError } from "../middleware/errorHandler.js";
import { isCloudinaryImageUrl, uploadImage } from "./cloudinary.js";
import { generateImage, isImageGenerationConfigured, supportsReferenceImages } from "./imageGeneration.js";

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

// Patterned on the shop's existing customizer photos: a single wrapped bouquet, centered, front view,
// on a plain white studio background with a soft shadow.
export const buildPreviewPrompt = (selection: BouquetSelection, hasReference: boolean) => {
  const { palette, wrap, ribbon } = selection;
  const paperColor = PALETTE_PAPER_COLORS[palette.code] ?? "soft-colored";
  const ribbonColor = PALETTE_RIBBON_COLORS[palette.code] ?? palette.name.toLowerCase();

  const flowerText = listText(
    selection.flowers.map(({ option, quantity }) => {
      const look = FLOWER_LOOKS[option.code];
      if (!look) {
        return `${countWord(quantity)} ${palette.name.toLowerCase()} ${option.name.toLowerCase()}`;
      }
      const color = look.colors[palette.code] ?? DEFAULT_FLOWER_COLORS[option.code] ?? palette.name.toLowerCase();
      return `${countWord(quantity)} ${(quantity === 1 ? look.singular : look.plural).replace("{color}", color)}${look.detail}`;
    })
  );
  const totalStems = selection.flowers.reduce((total, flower) => total + flower.quantity, 0);
  const fillerText = selection.fillers.length > 0
    ? `, plus ${listText(
        selection.fillers.map((filler) =>
          (FILLER_WORDS[filler.code] ?? filler.name.toLowerCase()).replace("{aster}", ASTER_COLORS[palette.code] ?? "white")
        )
      )}`
    : ", with only a few small green leaves and no filler flowers";
  const wrapText = (WRAP_WORDS[wrap.code] ?? `${wrap.name.toLowerCase()} wrapping`).replace("{paper}", paperColor);
  const ribbonText = (RIBBON_WORDS[ribbon.code] ?? `a ${ribbon.name.toLowerCase()} bow`).replace("{ribbon}", ribbonColor);

  return [
    hasReference
      ? "Match the attached shop photo's style (camera angle, framing, white background, shadow, lighting), but not its flowers, colors, paper or ribbon."
      : null,
    `Photorealistic studio product photo of a florist bouquet with exactly ${flowerText}${fillerText}.`,
    `It has exactly ${countWord(totalStems)} main ${totalStems === 1 ? "flower" : "flowers"} in total, each clearly visible, and no other kinds of flowers.`,
    `Wrapped in ${wrapText}, tied around the stems with ${ribbonText}.`,
    "Centered, front view, the whole bouquet in frame with white space around it, on a pure white background with a soft shadow.",
    "Every flower is a real variety in a true-to-life color, exactly as sold by florists in the Philippines.",
    "Soft studio lighting, sharp focus, real fresh flowers with natural textures. No text, no hands, no vase."
  ]
    .filter((line) => line !== null)
    .join("\n");
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
  const image = await generateImage(buildPreviewPrompt(selection, reference !== null), reference ? [reference] : []);
  // replace: a leftover asset under this key was removed from the cache (e.g. by an admin) and is stale.
  const { url } = await uploadImage(image.data, image.mimeType, {
    publicId: `${config.cloudinary.builderPreviewFolder}/${key}`,
    replace: true
  });
  await saveGeneratedPreview(key, describeSelection(selection), url, userId);
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
