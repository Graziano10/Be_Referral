// src/config/logger.ts
import { createLogger, format, transports, Logger } from "winston";
import env, { isDev, isProduction } from "./env";

const { combine, timestamp, printf, colorize } = format;

const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}] ${message}`;
});

function makeProductionLogger(): Logger {
  return createLogger({
    level: "http",
    format: combine(colorize(), timestamp({ format: "HH:mm:ss" }), logFormat),
    transports: [
      new transports.Console(),
      new transports.File({ filename: "logs/errors.log", level: "error" }),
      new transports.File({ filename: "logs/warnings.log", level: "warn" }),
      new transports.File({ filename: "logs/history.log" }),
    ],
  });
}

function makeDevelopmentLogger(): Logger {
  return createLogger({
    level: "silly",
    format: combine(colorize(), timestamp({ format: "HH:mm:ss" }), logFormat),
    transports: [new transports.Console()],
  });
}

// ✅ crea UNA SOLA istanza in base all’ambiente, senza riassegnazioni
export const logger: Logger = isProduction
  ? makeProductionLogger()
  : makeDevelopmentLogger();
