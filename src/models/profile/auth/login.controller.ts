// src/models/controllers/auth/login.controller.ts
import { Request, Response } from "express";
import {
  HTTP_200_OK,
  HTTP_400_BAD_REQUEST,
  HTTP_403_FORBIDDEN,
  HTTP_404_NOT_FOUND,
  HTTP_500_INTERNAL_SERVER_ERROR,
} from "../../httpUtils";
import { AuthUser, Profile, Session } from "../../../database/models";
import { createAccessToken } from "../../httpUtils";
import { z } from "zod";
import crypto from "crypto";
import { loginSchema } from "../../../validators/profile.validators";
import mongoose, { Types } from "mongoose";

export const ALLOWED_LOGIN_ROLES = ["superAdmin", "user"] as const;

type LoginRequestBody = z.infer<typeof loginSchema>;

type LeanProfile = {
  _id: Types.ObjectId;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
};

type LeanAuthUser = {
  _id: Types.ObjectId;
  password: string;
};

function handleLoginError(err: any, res: Response) {
  if (err?.name === "ZodError") {
    const errors = err.issues.map((i: any) => ({
      field: i.path.join(".") || "root",
      message: i.message,
    }));
    return HTTP_400_BAD_REQUEST(res, { message: "Validation error", errors });
  }

  if (err?.status && err?.message) {
    return res.status(err.status).json({ message: err.message });
  }

  console.error("Error Login BE:", err);
  return HTTP_500_INTERNAL_SERVER_ERROR(res, "Internal Server Error");
}

// Funzione di utilità: fa il login e ritorna profilo/token, senza check ruoli
async function baseLogin(email: string, password: string, req: Request) {
  const normEmail = String(email).trim().toLowerCase();

  const existingProfile = await Profile.findOne({ email: normEmail })
    .select("_id email firstName lastName role")
    .lean<LeanProfile>();

  if (!existingProfile) {
    throw { status: 404, message: "A profile for this email does not exist" };
  }

  const existingAuthUser = await AuthUser.findOne({ email: normEmail })
    .select("_id password")
    .lean<LeanAuthUser>();

  if (!existingAuthUser) {
    throw { status: 404, message: "Auth_User not found for this email" };
  }

  // --- Check password ---
  const parts = String(existingAuthUser.password).split("$");
  if (parts.length !== 4)
    throw { status: 500, message: "Password format error" };

  const [algorithm, iterationsStr, salt, originalHashHex] = parts;
  if (algorithm !== "pbkdf2_sha256")
    throw { status: 500, message: "Unsupported hash algorithm" };

  const iterations = Number.parseInt(iterationsStr, 10);
  if (!Number.isFinite(iterations) || iterations <= 0)
    throw { status: 500, message: "Invalid hash iterations" };

  const computed = crypto.pbkdf2Sync(password, salt, iterations, 32, "sha256");
  const original = Buffer.from(originalHashHex, "hex");

  if (
    computed.length !== original.length ||
    !crypto.timingSafeEqual(computed, original)
  ) {
    throw { status: 400, message: "Wrong credentials" };
  }

  // --- Crea JWT ---
  const jwtPayload = {
    sub: existingAuthUser._id.toHexString(),
    profileId: existingProfile._id.toHexString(),
    email: normEmail,
    role: [existingProfile.role],
  };

  const token = createAccessToken(jwtPayload, { expiresIn: "7d" });

  await Session.create({
    profile: existingProfile._id,
    lastAuthorizedIp: req.ip,
    token,
    userAgent: req.get("user-agent"),
  });

  return {
    profile: {
      id: existingProfile._id.toHexString(),
      email: existingProfile.email,
      firstName: existingProfile.firstName,
      lastName: existingProfile.lastName,
      role: existingProfile.role,
    },
    token,
  };
}

// POST /profile/login
export const loginRegister = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body as LoginRequestBody);
    const result = await baseLogin(email, password, req);

    // ✅ Nessun filtro ruolo → accedono TUTTI
    return HTTP_200_OK(res, result);
  } catch (err: any) {
    return handleLoginError(err, res);
  }
};

// POST /profile/login/auth
export const loginDashboard = async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body as LoginRequestBody);
    const result = await baseLogin(email, password, req);

    const allowedRoles = ["admin", "superAdmin"];
    if (!allowedRoles.includes(result.profile.role)) {
      return HTTP_403_FORBIDDEN(res, "Profilo non autorizzato in dashboard");
    }

    return HTTP_200_OK(res, result);
  } catch (err: any) {
    return handleLoginError(err, res);
  }
};
