import type { Request } from "express";
import { HttpError } from "../middleware/errorHandler.js";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const bodyOf = (req: Request) => (isRecord(req.body) ? req.body : {});

export const requireString = (value: unknown, field: string, max = 255, min = 1) => {
  if (typeof value !== "string") {
    throw new HttpError(400, `${field} is required`);
  }
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new HttpError(400, min > 1 ? `${field} must be ${min}-${max} characters` : `${field} is required (max ${max} characters)`);
  }
  return trimmed;
};

export const requireEmail = (value: unknown) => {
  const email = requireString(value, "Email", 255).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, "Email is invalid");
  }
  return email;
};

// Rules for passwords being set (sign-up, reset). Login still accepts older, shorter passwords.
export const requireNewPassword = (value: unknown) => {
  if (typeof value !== "string" || value.length === 0) {
    throw new HttpError(400, "Password is required");
  }
  if (value.length < 8 || value.length > 200) {
    throw new HttpError(400, "Password must be 8-200 characters");
  }
  if (!/[a-z]/i.test(value) || !/\d/.test(value)) {
    throw new HttpError(400, "Password must include at least one letter and one number");
  }
  return value;
};

export const requireOtpCode = (value: unknown) => {
  if (typeof value !== "string" || !/^\d{6}$/.test(value.trim())) {
    throw new HttpError(400, "Enter the 6-digit code from your email");
  }
  return value.trim();
};

// Tags validation errors with the input they belong to (see HttpError.field).
export const forField = <T>(field: string, validate: () => T): T => {
  try {
    return validate();
  } catch (error) {
    if (error instanceof HttpError && !error.field) {
      throw new HttpError(error.status, error.message, field);
    }
    throw error;
  }
};

export const requireContactNumber = (value: unknown) => {
  const contact = requireString(value, "Contact number", 32);
  if (!/^[0-9+()\s-]{7,32}$/.test(contact)) {
    throw new HttpError(400, "Contact number is invalid");
  }
  return contact;
};

export const requireInt = (value: unknown, field: string, min: number, max: number) => {
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    throw new HttpError(400, `${field} must be a whole number from ${min} to ${max}`);
  }
  return value;
};

export const requireOneOf = <T extends string>(value: unknown, field: string, allowed: readonly T[]): T => {
  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new HttpError(400, `${field} must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
};

export const requireId = (value: unknown, field = "id") => {
  if (typeof value !== "string" || !/^[a-z0-9-]{1,128}$/i.test(value)) {
    throw new HttpError(400, `Invalid ${field}`);
  }
  return value;
};

export const isDuplicateEntry = (error: unknown) =>
  isRecord(error) && error.code === "ER_DUP_ENTRY";
