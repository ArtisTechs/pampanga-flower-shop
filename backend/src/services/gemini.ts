import { config } from "../config.js";
import { HttpError } from "../middleware/errorHandler.js";

const { apiKey, imageModel } = config.gemini;

export const isGeminiConfigured = () => Boolean(apiKey);

interface InlineImage {
  mimeType: string;
  data: Buffer;
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: GeminiPart[] }; finishReason?: string }>;
  promptFeedback?: { blockReason?: string };
  error?: { message?: string };
}

// Text-and-image to image via the REST API (https://ai.google.dev/gemini-api/docs/image-generation), no SDK.
// The reference images go before the prompt so the instructions can refer to them.
export const generateImage = async (prompt: string, references: InlineImage[] = []): Promise<InlineImage> => {
  if (!isGeminiConfigured()) {
    throw new HttpError(503, "Bouquet previews can't be generated right now");
  }

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(imageModel)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                ...references.map((image) => ({
                  inlineData: { mimeType: image.mimeType, data: image.data.toString("base64") }
                })),
                { text: prompt }
              ]
            }
          ],
          generationConfig: {
            responseModalities: ["IMAGE"],
            imageConfig: { aspectRatio: "1:1" }
          }
        }),
        signal: AbortSignal.timeout(90_000)
      }
    );
  } catch (error) {
    console.error("Gemini request failed:", error);
    throw new HttpError(502, "The bouquet preview couldn't be generated. Please try again.");
  }

  const result = (await response.json().catch(() => ({}))) as GeminiResponse;
  const part = result.candidates?.[0]?.content?.parts?.find((entry) => entry.inlineData?.data || entry.inline_data?.data);
  const data = part?.inlineData?.data ?? part?.inline_data?.data;
  if (!response.ok || !data) {
    // Logged server-side only; the response can echo request details.
    console.error(
      `Gemini image generation failed (${response.status}):`,
      result.error?.message ?? result.promptFeedback?.blockReason ?? result.candidates?.[0]?.finishReason ?? "no image returned"
    );
    throw new HttpError(502, "The bouquet preview couldn't be generated. Please try again.");
  }

  return {
    mimeType: part?.inlineData?.mimeType ?? part?.inline_data?.mime_type ?? "image/png",
    data: Buffer.from(data, "base64")
  };
};
