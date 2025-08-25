// src/models/profile/httpUtils.ts
import axios from "axios";
import type { Response } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";

// Se hai un modulo env centralizzato, usalo (consigliato):
// import env from "../../config/env";
// const ACCESS_SECRET = env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET;
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;

const api = axios.create({
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// Evita i tipi Axios nominali: usa 'any' per le options e cast controllato sulle risposte
export async function axiosRequest<T = any>(
  options: any
): Promise<{ status: number; data: T | null }> {
  try {
    const response = await api.request(options);
    return { status: response.status, data: response.data as T };
  } catch (err) {
    const e: any = err; // narrow manuale
    return {
      status: e?.response?.status ?? 500,
      data: (e?.response?.data as T | undefined) ?? null,
    };
  }
}

/** Payload JWT atteso per l'access token */
export type AccessJwtPayload = {
  sub: string; // id AuthUser (o chi preferisci)
  profileId: string; // id Profile -> usato dal middleware
  email: string; // email normalizzata
  uid?: number; // (opzionale) profile.user_id
  rememberMe?: boolean; // (opzionale) flag
};

/** Genera un access token (default: 7 giorni) con la chiave JWT_ACCESS_SECRET */
export function createAccessToken(
  payload: AccessJwtPayload,
  options?: SignOptions
) {
  if (!ACCESS_SECRET) throw new Error("JWT_ACCESS_SECRET is not set");
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "7d", ...options });
}

/** (Opzionale) Verifica un access token con la stessa chiave */
export function verifyAccessToken(token: string): AccessJwtPayload {
  if (!ACCESS_SECRET) throw new Error("JWT_ACCESS_SECRET is not set");
  const decoded = jwt.verify(token, ACCESS_SECRET);
  // `jwt.verify` può restituire string | object; normalizziamo a oggetto tipizzato
  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }
  const { sub, profileId, email } = decoded as any;
  if (!sub || !profileId || !email) {
    throw new Error("Missing claims in token");
  }
  return {
    sub: String(sub),
    profileId: String(profileId),
    email: String(email),
  };
}

// ---- HTTP helpers ----
export function HTTP_200_OK(res: Response, payload: unknown, status = 200) {
  return res.status(status).json(payload);
}
export function HTTP_400_BAD_REQUEST(res: Response, payload: unknown) {
  return res.status(400).json(payload);
}
export function HTTP_401_UNAUTHORIZED(res: Response, payload: unknown) {
  return res.status(401).json(payload);
}
export function HTTP_404_NOT_FOUND(res: Response, payload: unknown) {
  return res.status(404).json(payload);
}
export function HTTP_403_FORBIDDEN(res: Response, payload: unknown) {
  return res.status(403).json(payload);
}
export function HTTP_500_INTERNAL_SERVER_ERROR(
  res: Response,
  payload: unknown
) {
  return res.status(500).json(payload);
}
