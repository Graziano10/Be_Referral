// src/models/controllers/auth/login.controller.ts
import { Request, Response } from "express";
import {
  HTTP_200_OK,
  HTTP_400_BAD_REQUEST,
  HTTP_404_NOT_FOUND,
  HTTP_500_INTERNAL_SERVER_ERROR,
} from "../../httpUtils";
import { AuthUser, Profile, Session } from "../../../database/models";
import { createAccessToken } from "../../httpUtils";
import { z } from "zod";
import crypto from "crypto";
import { loginSchema } from "../../../validators/profile.validators";
import mongoose, { Types } from "mongoose";

type LoginRequestBody = z.infer<typeof loginSchema>;

type LeanProfile = {
  _id: Types.ObjectId;
  email: string;
  firstName?: string;
  lastName?: string;
};

type LeanAuthUser = {
  _id: Types.ObjectId;
  password: string;
};

export const login = async (req: Request, res: Response) => {
  try {
    // 1) Valida e normalizza input
    const { email, password } = loginSchema.parse(req.body as LoginRequestBody);
    const normEmail = String(email).trim().toLowerCase();

    // 2) Carica profilo (fonte di verità) e utente auth
    const existingProfile = await Profile.findOne({ email: normEmail })
      .select("_id email firstName lastName")
      .lean<LeanProfile>();

    if (!existingProfile) {
      return HTTP_404_NOT_FOUND(res, "A profile for this email does not exist");
    }

    const existingAuthUser = await AuthUser.findOne({ email: normEmail })
      .select("_id password")
      .lean<LeanAuthUser>();

    if (!existingAuthUser) {
      return HTTP_404_NOT_FOUND(res, "Auth_User not found for this email");
    }

    // 3) Verifica password (formato atteso: algo$iter$salt$hashHex)
    const parts = String(existingAuthUser.password).split("$");
    if (parts.length !== 4) {
      return HTTP_500_INTERNAL_SERVER_ERROR(res, "Password format error");
    }
    const [algorithm, iterationsStr, salt, originalHashHex] = parts;
    if (algorithm !== "pbkdf2_sha256") {
      return HTTP_500_INTERNAL_SERVER_ERROR(res, "Unsupported hash algorithm");
    }

    const iterations = Number.parseInt(iterationsStr, 10);
    if (!Number.isFinite(iterations) || iterations <= 0) {
      return HTTP_500_INTERNAL_SERVER_ERROR(res, "Invalid hash iterations");
    }

    const computed = crypto.pbkdf2Sync(
      password,
      salt,
      iterations,
      32,
      "sha256"
    );
    const original = Buffer.from(originalHashHex, "hex");

    // Confronto a tempo costante
    if (
      computed.length !== original.length ||
      !crypto.timingSafeEqual(computed, original)
    ) {
      return HTTP_400_BAD_REQUEST(res, "Wrong credentials");
    }

    // 4) Genera JWT con profileId (niente roles)
    const jwtPayload = {
      sub: existingAuthUser._id.toHexString(),
      profileId: existingProfile._id.toHexString(),
      email: normEmail,
    };

    const token = createAccessToken(jwtPayload, { expiresIn: "7d" });

    // 5) Salva sessione
    await Session.create({
      profile: existingProfile._id, // ObjectId tipizzato
      lastAuthorizedIp: req.ip,
      token,
      userAgent: req.get("user-agent"),
    });

    // 6) Risposta safe
    return HTTP_200_OK(res, {
      profile: {
        id: existingProfile._id.toHexString(),
        email: existingProfile.email,
        firstName: existingProfile.firstName,
        lastName: existingProfile.lastName,
      },
      token,
    });
  } catch (err: any) {
    if (err?.name === "ZodError") {
      const errors = err.issues.map((i: any) => ({
        field: i.path.join(".") || "root",
        message: i.message,
      }));
      return HTTP_400_BAD_REQUEST(res, { message: "Validation error", errors });
    }
    console.error("Error Login BE", err);
    return HTTP_500_INTERNAL_SERVER_ERROR(res, "Internal Server Error");
  }
};
