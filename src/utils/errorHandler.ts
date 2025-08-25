import { Response } from "express";
import { ZodError } from "zod";
import { MongoServerError } from "mongodb";

export type PrettyIssue = { field: string; message: string };

export function formatZodIssues(err: ZodError): PrettyIssue[] {
  return err.issues.map((i) => ({
    field: i.path.join(".") || "root",
    message: i.message,
  }));
}

export function handleControllerError(res: Response, err: any) {
  // Zod
  if (err instanceof ZodError || err?.name === "ZodError") {
    return res.status(400).json({
      message: "Validation error",
      errors: err instanceof ZodError ? formatZodIssues(err) : err.errors,
    });
  }

  // Mongo unique key (duplicato IBAN)
  if ((err as MongoServerError)?.code === 11000) {
    const key = (err as MongoServerError).keyPattern || {};
    if (key["iban_hash"]) {
      return res.status(409).json({ message: "IBAN già registrato" });
    }
    return res
      .status(409)
      .json({ message: "Duplicate key error", keyPattern: key });
  }

  // CastError/ObjectId non valido ecc.
  if (err?.name === "CastError") {
    return res
      .status(400)
      .json({ message: "Parametro non valido", details: err.message });
  }

  // Fallback
  console.error(err);
  return res.status(500).json({ message: "Internal server error" });
}
