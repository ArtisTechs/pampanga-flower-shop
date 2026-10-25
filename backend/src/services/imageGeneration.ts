import { config } from "../config.js";
import { generateCloudflareImage, isCloudflareAiConfigured } from "./cloudflareAi.js";
import { generateImage as generateGeminiImage, isGeminiConfigured } from "./gemini.js";

interface InlineImage {
  mimeType: string;
  data: Buffer;
}

// IMAGE_PROVIDER picks the generator: Cloudflare Workers AI (default, free daily allowance, text only)
// or Gemini (paid, can follow a reference photo).
const isGemini = config.imageGeneration.provider === "gemini";

export const isImageGenerationConfigured = () => (isGemini ? isGeminiConfigured() : isCloudflareAiConfigured());

export const supportsReferenceImages = isGemini;

export const generateImage = (prompt: string, references: InlineImage[] = []): Promise<InlineImage> =>
  isGemini ? generateGeminiImage(prompt, references) : generateCloudflareImage(prompt);
