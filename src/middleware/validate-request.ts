import type { RequestHandler } from "express";
import type { ZodSchema } from "zod";
import { ZodError } from "zod";

const validationErrorResponse = (issues: ZodError["issues"]) => ({
  error: {
    code: "VALIDATION_ERROR",
    message: "Validation failed",
    details: issues.map((issue) => ({
      field: issue.path.join("."),
      reason: issue.message,
    })),
  },
});

const validate = <T>(schema: ZodSchema<T>, source: "body" | "params" | "query"): RequestHandler => {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      res.status(422).json(validationErrorResponse(result.error.issues));
      return;
    }

    if (source === "query") {
      Object.defineProperty(req, "query", {
        value: result.data,
        configurable: true,
      });
    } else {
      req[source] = result.data;
    }
    next();
  };
};

export const validateBody = <T>(schema: ZodSchema<T>): RequestHandler => validate(schema, "body");
export const validateParams = <T>(schema: ZodSchema<T>): RequestHandler =>
  validate(schema, "params");
export const validateQuery = <T>(schema: ZodSchema<T>): RequestHandler => validate(schema, "query");

export const isZodError = (error: unknown): error is ZodError => error instanceof ZodError;
