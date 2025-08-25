// src/middlewares/errorHandler.ts
import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import env, { isDev, isProduction } from "../config/env";
import { logger } from "../config/logger";

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const status =
    err.status ??
    err.statusCode ??
    (err instanceof ZodError
      ? 422
      : err.name === "MongoServerError"
      ? 409
      : 500);

  // Log dettagliato lato server
  logger.error(err);

  // Risposta client
  if (err instanceof ZodError) {
    return res.status(status).json({
      status: "Unprocessable Entity",
      errors: err.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
        code: i.code,
      })),
    });
  }

  const payload: any = {
    status: status >= 500 ? "error" : "fail",
    message: err.message || "Internal Server Error",
  };

  if (isDev && err.stack) payload.stack = err.stack;

  return res.status(status).json(payload);
};
