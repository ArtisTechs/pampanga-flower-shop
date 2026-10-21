import type { ErrorRequestHandler, RequestHandler } from "express";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(message);
  }
}

export const notFound: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Not found" });
};

// Express 5 forwards rejected async handlers here automatically.
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  // Body parser errors (malformed JSON, body too large) carry a client-safe 4xx status.
  if (typeof error?.status === "number" && error.status >= 400 && error.status < 500 && error.expose) {
    res.status(error.status).json({
      error: error.status === 413 ? "Upload is too large" : "Invalid request body"
    });
    return;
  }

  // Log details server-side only; never leak internals (SQL errors, stacks) to clients.
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
};
