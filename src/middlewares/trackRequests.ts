// src/middlewares/trackRequests.ts
import { NextFunction, Request, Response } from "express";
import { logger } from "../config/logger";

export const trackRequests = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = process.hrtime.bigint();
  const { method, originalUrl } = req;
  const ip = req.ip;

  res.on("finish", () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    const status = res.statusCode;
    const userEmail = (req as any).profile?.email;

    const msg = `${ip} ${method} ${originalUrl} - ${status} ${durationMs.toFixed(
      1
    )}ms${userEmail ? ` [${userEmail}]` : ""}`;

    if (status >= 500) logger.error(msg);
    else if (status >= 400) logger.warn(msg);
    else logger.http(msg);
  });

  next();
};
