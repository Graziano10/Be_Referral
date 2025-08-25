import { ZodError, type ZodTypeAny } from "zod";
import type { NextFunction, Request, Response } from "express";

type RequestValidators = {
  params?: ZodTypeAny;
  query?: ZodTypeAny;
  body?: ZodTypeAny;
};

// estendiamo res.locals per tenere i valori validati
declare global {
  namespace Express {
    interface Locals {
      validated?: {
        params?: any;
        query?: any;
        body?: any;
      };
    }
  }
}

export const validateRequest =
  (validators: RequestValidators) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated: Record<string, any> = {};

      if (validators.params) {
        validated.params = await validators.params.parseAsync(req.params);
      }
      if (validators.query) {
        validated.query = await validators.query.parseAsync(req.query);
      }
      if (validators.body) {
        validated.body = await validators.body.parseAsync(req.body);
      }

      res.locals.validated = validated; // ✅ salviamo qui
      return next();
    } catch (e) {
      if (e instanceof ZodError) {
        return res.status(422).json({
          status: "Unprocessable Entity",
          errors: e.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
            code: issue.code,
          })),
        });
      }
      return res
        .status(400)
        .json({ status: "Bad Request", message: (e as Error).message });
    }
  };
