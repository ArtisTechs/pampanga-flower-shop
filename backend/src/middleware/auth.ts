import type { Request, RequestHandler, Response } from "express";
import { findSessionUser, type AuthUser } from "../auth/sessions.js";
import { HttpError } from "./errorHandler.js";

export const bearerToken = (req: Request) => /^Bearer (\S+)$/.exec(req.get("authorization") ?? "")?.[1] ?? null;

const authenticate = async (req: Request, res: Response) => {
  const token = bearerToken(req);
  const user = token ? await findSessionUser(token) : null;
  if (!user) {
    throw new HttpError(401, "Please log in to continue");
  }
  res.locals.user = user;
  return user;
};

export const requireAuth: RequestHandler = async (req, res, next) => {
  await authenticate(req, res);
  next();
};

export const requireAdmin: RequestHandler = async (req, res, next) => {
  const user = await authenticate(req, res);
  if (user.role !== "admin") {
    throw new HttpError(403, "Admin access required");
  }
  next();
};

// Only valid after requireAuth/requireAdmin has run for the route.
export const currentUser = (res: Response) => res.locals.user as AuthUser;
