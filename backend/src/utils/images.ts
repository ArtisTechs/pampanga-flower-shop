import express, { type Request } from "express";
import { HttpError } from "../middleware/errorHandler.js";

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

// Raw image body parser for upload routes (the client sends the file itself, typed by Content-Type).
export const rawImageBody = express.raw({ type: [...IMAGE_TYPES], limit: MAX_IMAGE_BYTES });

const hasImageSignature = (data: Buffer, type: ImageType) => {
  if (type === "image/jpeg") {
    return data.length > 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  }
  if (type === "image/png") {
    return data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return data.subarray(0, 4).toString("latin1") === "RIFF" && data.subarray(8, 12).toString("latin1") === "WEBP";
};

// The uploaded image and its type; rejects anything whose bytes don't match a JPG, PNG, or WebP.
export const requireUploadedImage = (req: Request) => {
  const type = IMAGE_TYPES.find((imageType) => req.is(imageType));
  if (!type || !Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw new HttpError(415, "Upload a JPG, PNG, or WebP image");
  }
  if (!hasImageSignature(req.body, type)) {
    throw new HttpError(415, "The file is not a valid JPG, PNG, or WebP image");
  }
  return { image: req.body, type };
};
