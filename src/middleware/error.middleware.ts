import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) {
    super(message);
    this.name = "HttpError";
  }
}

export const errorMiddleware: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: error.issues.map(({ path, message }) => ({ path: path.join("."), message })),
      },
    });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (typeof error === "object" && error !== null && "type" in error && error.type === "entity.parse.failed") {
    res.status(400).json({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON" } });
    return;
  }
  console.error("Request failed");
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred" } });
};
