// src/config/env.ts
import dotenv from "dotenv";
import { cleanEnv, port, str, url, makeValidator } from "envalid";

dotenv.config();

// Valida che sia mongodb:// o mongodb+srv://
const mongoUri = makeValidator<string>((v) => {
  if (!/^mongodb(\+srv)?:\/\//i.test(v)) {
    throw new Error("MONGO_URI must start with mongodb:// or mongodb+srv://");
  }
  return v;
});

// Valida lista separata da virgole → array
const csv = makeValidator<string[]>((input) =>
  input.split(",").map((s) => s.trim())
);

const env = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ["development", "production", "test"],
    default: "development",
  }),
  API_PORT: port({ default: 3000 }),
  API_URL: url({ default: "http://localhost:3000" }),

  MONGO_URI: mongoUri(),

  JWT_ACCESS_SECRET: str(),
  COOKIE_SECRET: str(),

  // Security
  CORS_ORIGINS: str({ default: "*" }),

  // Referral
  REF_LINK_BASE: url({ default: "http://localhost:5173/register" }),
});

export const isDev = env.NODE_ENV === "development";
export const isProduction = env.NODE_ENV === "production";

export type Env = typeof env;
export default env;
