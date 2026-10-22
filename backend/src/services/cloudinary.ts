import { createHash } from "node:crypto";
import { config } from "../config.js";
import { HttpError } from "../middleware/errorHandler.js";

const { cloudName, apiKey, apiSecret, folder } = config.cloudinary;

export const isCloudinaryConfigured = () => Boolean(cloudName && apiKey && apiSecret);

// Only images delivered from this shop's Cloudinary account are accepted as product images.
export const isCloudinaryImageUrl = (value: string) =>
  isCloudinaryConfigured()
  && value.startsWith(`https://res.cloudinary.com/${cloudName}/image/upload/`)
  && !/[\s"'<>\\]/.test(value);

// Signed upload via the REST API (https://cloudinary.com/documentation/upload_images#generating_authentication_signatures):
// SHA-1 of the alphabetically sorted params joined as k=v&..., followed by the API secret.
const sign = (params: Record<string, string>) => {
  const toSign = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(`${toSign}${apiSecret}`).digest("hex");
};

interface CloudinaryUploadResponse {
  secure_url?: string;
  public_id?: string;
  error?: { message?: string };
}

// With publicId (full path, e.g. "shop/catalog/rose1") the upload is idempotent: an existing asset
// is kept and returned instead of creating a duplicate. Without it, Cloudinary names the file.
export const uploadImage = async (image: Buffer, mimeType: string, options: { publicId?: string } = {}) => {
  if (!isCloudinaryConfigured()) {
    throw new HttpError(503, "Image uploads are not configured on the server");
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const params: Record<string, string> = options.publicId
    ? { public_id: options.publicId, overwrite: "false", timestamp }
    : { folder, timestamp };
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(image)], { type: mimeType }));
  form.append("api_key", apiKey);
  for (const [key, value] of Object.entries(params)) {
    form.append(key, value);
  }
  form.append("signature", sign(params));

  let response: Response;
  try {
    response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(30_000)
    });
  } catch (error) {
    console.error("Cloudinary upload request failed:", error);
    throw new HttpError(502, "Image upload failed. Please try again.");
  }

  const result = (await response.json().catch(() => ({}))) as CloudinaryUploadResponse;
  if (!response.ok || !result.secure_url) {
    // Logged server-side only; Cloudinary messages can include account details.
    console.error(`Cloudinary upload failed (${response.status}):`, result.error?.message);
    throw new HttpError(502, "Image upload failed. Please try again.");
  }

  return { url: result.secure_url, publicId: result.public_id ?? "" };
};
