import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import "dotenv/config";

import env from "./config/env";
import { trackRequests } from "./middlewares/trackRequests";
import { errorHandler } from "./middlewares/errorHandler";
import { logger } from "./config/logger";
import { profileRoutes } from "./routes/profile.routes";
import { referralRoutes } from "./routes/referral.routes";
import { awardRoutes } from "./routes/award.routes";

// importa i tuoi router quando li avrai
// import sessionRoutes from "./modules/session/session.routes";
// import profileRoutes from "./modules/profile/profile.routes";

const app = express();
const corsOrigins = env.CORS_ORIGINS?.split(",")
  .map((s) => s.trim())
  .filter(Boolean) ?? ["*"];

// security & parsers
app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser(env.COOKIE_SECRET));

// rate limit (v7)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100, // ✅ v7
    // opzionale: header standard (draft-8)
    standardHeaders: "draft-8",
    handler: (_req, res) => {
      res.status(429).json({
        status: "Too Many Requests",
        message: "Troppi tentativi, riprova più tardi.",
      });
    },
  })
);

// request log
app.use(trackRequests);

// health
app.get("/health", (_req, res) => res.status(200).json({ ok: true }));

// routes
// app.use("/session", sessionRoutes);
app.use("/profile", profileRoutes);
app.use("/referral", referralRoutes);
app.use("/award", awardRoutes);

// root
app.get("/", (_req: Request, res: Response) => {
  res.status(200).send("🚀 Backend attivo e funzionante!");
});

// 404
app.use((_req, res) => res.status(404).json({ status: "Not Found" }));

// error handler (ultimo)
app.use(errorHandler);

let server: import("http").Server;

(async () => {
  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(env.MONGO_URI);
    logger.info("✅ Connessione a MongoDB riuscita!");

    server = app.listen(env.API_PORT, () => {
      logger.info(`🚀 Server in ascolto su ${env.API_URL}:${env.API_PORT}`);
    });

    server.on("error", (err) => {
      logger.error("❌ Errore server HTTP", err);
      process.exit(1);
    });
  } catch (error) {
    logger.error("❌ Errore durante la connessione al DB:", error);
    process.exit(1);
  }
})();

// graceful shutdown
process.on("SIGINT", async () => {
  logger.warn("🔻 SIGINT");
  server?.close(() => logger.info("HTTP chiuso"));
  await mongoose.connection.close();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  logger.warn("🔻 SIGTERM");
  server?.close(() => logger.info("HTTP chiuso"));
  await mongoose.connection.close();
  process.exit(0);
});
