// src/modules/profile/profile.controller.ts
import type { Request, Response, NextFunction } from "express";
import env from "../../config/env";
import { ProfileService } from "./postProfile.service";
import { logger } from "../../config/logger";
import {
  HTTP_200_OK,
  HTTP_400_BAD_REQUEST,
  HTTP_500_INTERNAL_SERVER_ERROR,
} from "../httpUtils";

import { AuthUser, Profile, Session } from "../../database/models";
import { createAccessToken } from "../httpUtils";
import crypto from "crypto";

export const registerProfile = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const q = (res.locals.validated?.query ?? req.query) as any;
    const b = (res.locals.validated?.body ?? req.body) as any;

    // --- Referral code dalle sorgenti previste
    const refFromQuery = typeof q?.ref === "string" ? q.ref : undefined;
    const refCode = (
      refFromQuery || (b?.referredByCode as string | undefined)
    )?.toUpperCase();

    // --- Normalizzazione input
    const email: string = String(b.email ?? "")
      .trim()
      .toLowerCase();
    const firstName: string = String(b.firstName ?? b.name ?? "").trim();
    const lastName: string = String(b.lastName ?? "").trim();

    // --- Password obbligatoria
    const rawPassword: string = String(b.password ?? "");
    if (!rawPassword) {
      return HTTP_400_BAD_REQUEST(res, "Password mancante");
    }

    // --- user_id sequenziale (best-effort)
    let user_id: number | undefined =
      typeof b.user_id === "number" ? b.user_id : undefined;
    if (typeof user_id !== "number") {
      const lastProfileWithId = await Profile.findOne({
        user_id: { $exists: true },
      })
        .sort({ user_id: -1 })
        .lean<{ user_id?: number }>();
      user_id = lastProfileWithId?.user_id ? lastProfileWithId.user_id + 1 : 1;
    }

    // --- Crea profilo (service gestisce check unicità e referral)
    const result = await ProfileService.create(
      { ...b, user_id, email, firstName, lastName },
      refCode
    );

    if (result.conflict) {
      const msg =
        result.field === "user_id"
          ? "user_id già registrato"
          : "Email già registrata";
      return HTTP_400_BAD_REQUEST(res, msg);
    }

    const { doc } = result;

    // --- Stato referral
    const referralStatus: "applied" | "not_found" | "not_provided" = refCode
      ? doc.referredBy
        ? "applied"
        : "not_found"
      : "not_provided";

    // --- Hash password in formato pbkdf2_sha256$<iters>$<salt>$<hash>
    const iterations = 180000;
    const keyLength = 32;
    const digest = "sha256";
    const salt = crypto.randomBytes(16).toString("hex");
    const hashedPassword = crypto
      .pbkdf2Sync(rawPassword, salt, iterations, keyLength, digest)
      .toString("hex");
    const passwordField = `pbkdf2_sha256$${iterations}$${salt}$${hashedPassword}`;

    // --- auth_user.id sequenziale (best-effort)
    const lastAuth = await AuthUser.findOne()
      .sort({ id: -1 })
      .lean<{ id?: number }>();
    const nextAuthId = lastAuth?.id ? lastAuth.id + 1 : 1;

    // --- Crea auth_user
    const newAuthUser = await AuthUser.create({
      id: nextAuthId,
      email,
      username: email,
      password: passwordField,
      first_name: firstName,
      last_name: lastName,
      last_login: null,
      date_joined: new Date(),
    });

    // --- JWT (include profileId per il middleware)
    const token = createAccessToken({
      sub: String(newAuthUser._id), // id dell'AuthUser
      profileId: String(doc._id), // REQUIRED dal middleware
      email: doc.email, // già normalizzata
      uid: doc.user_id, // opzionale (vedi tipo AccessJwtPayload)
    });

    // --- Session (dopo la generazione del token)
    try {
      await Session.create({
        profile: doc._id,
        lastAuthorizedIp: req.ip, // se dietro proxy: app.set('trust proxy', 1)
        token,
      });
    } catch (e) {
      logger.warn("Session create failed on register:", e);
      // non bloccare la registrazione
    }

    // --- 201 Created + Location header verso la risorsa profilo
    res.setHeader("Location", `/api/profiles/${doc._id}`);

    return HTTP_200_OK(
      res,
      {
        ok: true,
        referral: { status: referralStatus, codeUsed: refCode ?? null },
        profile: {
          _id: doc._id,
          user_id: doc.user_id,
          firstName: doc.firstName,
          lastName: doc.lastName,
          email: doc.email,
          phone: doc.phone,
          companyName: doc.companyName,
          vatNumber: doc.vatNumber,
          region: doc.region,
          verified: doc.verified,
          referralCode: doc.referralCode,
          referredBy: doc.referredBy,
          dateJoined: doc.dateJoined,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
        auth_user: {
          id: newAuthUser.id,
          email: newAuthUser.email,
          username: newAuthUser.username,
          first_name: newAuthUser.first_name,
          last_name: newAuthUser.last_name,
          is_active: newAuthUser.is_active,
          is_staff: newAuthUser.is_staff,
          date_joined: newAuthUser.date_joined,
        },
        token,
      },
      201
    );
  } catch (err: any) {
    if (err?.code === 11000) {
      const key = Object.keys(err.keyValue ?? {})[0] ?? "chiave";
      const msg =
        key === "user_id"
          ? "user_id già registrato"
          : key === "email"
          ? "Email già registrata"
          : key === "username"
          ? "Username già registrato"
          : key === "referralCode"
          ? "Referral code già in uso"
          : "Dati già presenti";
      logger.warn(`Duplicate key on register: [${key}]`);
      return HTTP_400_BAD_REQUEST(res, msg);
    }
    logger.error("Errore registerProfile:", err);
    return HTTP_500_INTERNAL_SERVER_ERROR(res, "Errore interno");
  }
};
