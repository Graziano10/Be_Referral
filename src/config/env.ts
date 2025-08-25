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

const env = cleanEnv(process.env, {
  NODE_ENV: str({
    choices: ["development", "production", "test"],
    default: "development",
  }),
  API_PORT: port({ default: 3000 }),
  API_URL: url({ default: "http://localhost" }),

  // ✅ unico modo per configurare il DB
  MONGO_URI: mongoUri(),

  // Auth (JWT)
  JWT_ACCESS_SECRET: str(),

  // Security / CORS
  CORS_ORIGINS: str({ default: "*" }),
  COOKIE_SECRET: str(),

  REF_LINK_BASE: url({ default: "http://localhost:5173/register" }),
});

export const isDev = env.NODE_ENV === "development";
export const isProduction = env.NODE_ENV === "production";
export default env;
