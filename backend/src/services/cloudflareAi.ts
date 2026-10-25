import { config } from "../config.js";
import { HttpError } from "../middleware/errorHandler.js";

const { accountId, apiToken, imageModel, steps } = config.cloudflareAi;

// FLUX.1 [schnell] rejects longer prompts; the bouquet prompt stays well under it for every model.
export const CLOUDFLARE_PROMPT_LIMIT = 2048;

// FLUX.2 models take multipart form data; FLUX.1 [schnell] takes JSON.
const isMultipartModel = imageModel.includes("/flux-2-");

export const isCloudflareAiConfigured = () => Boolean(accountId && apiToken);

interface CloudflareAiResponse {
  success?: boolean;
  result?: { image?: string };
  errors?: Array<{ code?: number; message?: string }>;
}

const requestBody = (prompt: string): { body: FormData | string; headers: Record<string, string> } => {
  const text = prompt.slice(0, CLOUDFLARE_PROMPT_LIMIT);
  if (isMultipartModel) {
    const form = new FormData();
    form.append("prompt", text);
    form.append("width", "1024");
    form.append("height", "1024");
    return { body: form, headers: {} };
  }
  return {
    body: JSON.stringify({ prompt: text, steps: Math.min(8, Math.max(1, steps)) }),
    headers: { "Content-Type": "application/json" }
  };
};

// Text to image via the Workers AI REST API (https://developers.cloudflare.com/workers-ai/models/), no SDK.
// The free plan has a daily allowance; past it, requests fail until 00:00 UTC.
export const generateCloudflareImage = async (prompt: string) => {
  if (!isCloudflareAiConfigured()) {
    throw new HttpError(503, "Bouquet previews can't be generated right now");
  }

  const { body, headers } = requestBody(prompt);
  let response: Response;
  try {
    response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${imageModel}`,
      {
        method: "POST",
        headers: { ...headers, Authorization: `Bearer ${apiToken}` },
        body,
        signal: AbortSignal.timeout(90_000)
      }
    );
  } catch (error) {
    console.error("Cloudflare Workers AI request failed:", error);
    throw new HttpError(502, "The bouquet preview couldn't be generated. Please try again.");
  }

  const result = (await response.json().catch(() => ({}))) as CloudflareAiResponse;
  const image = result.result?.image;
  if (!response.ok || !image) {
    // Logged server-side only.
    console.error(
      `Cloudflare image generation failed (${response.status}):`,
      result.errors?.map((error) => `${error.code}: ${error.message}`).join("; ") || "no image returned"
    );
    throw new HttpError(502, "The bouquet preview couldn't be generated. Please try again.");
  }

  // Both FLUX models on Workers AI return a base64 JPEG.
  return { mimeType: "image/jpeg", data: Buffer.from(image, "base64") };
};
