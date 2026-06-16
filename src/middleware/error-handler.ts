import type { ErrorRequestHandler } from "express";
import { env } from "../config/env.js";
import { HttpError } from "../lib/http-error.js";
import { isZodError } from "./validate-request.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  if (isZodError(err)) {
    res.status(422).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: err.issues,
      },
    });
    return;
  }

  if (!env.isProduction) {
    console.error(err);
  }

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: env.isProduction
        ? "Internal server error"
        : err instanceof Error
          ? err.message
          : "Internal server error",
    },
  });
};
