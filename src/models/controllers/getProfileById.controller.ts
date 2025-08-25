// src/modules/profile/profile.controller.ts
import type { Request, Response, NextFunction } from "express";
import { Types, isValidObjectId } from "mongoose";
import { Profile } from "../../database/models";
import {
  HTTP_200_OK,
  HTTP_400_BAD_REQUEST,
  HTTP_404_NOT_FOUND,
  HTTP_500_INTERNAL_SERVER_ERROR,
} from "../httpUtils";

const SAFE_FIELDS = [
  "_id",
  "user_id",
  "firstName",
  "lastName",
  "email",
  "phone",
  "companyName",
  "vatNumber",
  "region",
  "verified",
  "referralCode",
  "referredBy",
  "dateJoined",
  "createdAt",
  "updatedAt",
] as const;

// GET /api/profiles/:profileId?fields=...&page=1&limit=10
export const getProfileById = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { profileId } = (res.locals.validated?.params ?? req.params) as {
      profileId: string;
    };
    if (!isValidObjectId(profileId)) {
      return HTTP_400_BAD_REQUEST(res, {
        ok: false,
        message: "ID profilo non valido",
      });
    }
    const pid = new Types.ObjectId(profileId);

    // --- proiezione sicura dei campi del profilo ---
    const fieldsParam = String(req.query.fields || "").trim();
    const requested = fieldsParam
      ? fieldsParam
          .split(",")
          .map((f) => f.trim())
          .filter(Boolean)
      : [];
    const allowed = new Set<string>(SAFE_FIELDS);
    const filtered = requested.filter((f) => allowed.has(f));
    const projection =
      filtered.length > 0
        ? filtered.join(" ")
        : (SAFE_FIELDS as readonly string[]).join(" ");

    // --- paginazione referrals ---
    const page = Math.max(parseInt(String(req.query.page || "1"), 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit || "10"), 10) || 10, 1),
      100
    );
    const skip = (page - 1) * limit;

    // --- query in parallelo ---
    const [profileDoc, referrals, totalReferrals] = await Promise.all([
      Profile.findOne({ _id: pid }).select(projection).lean(),
      Profile.find({ referredBy: pid })
        .select("_id email user_id firstName lastName createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Profile.countDocuments({ referredBy: pid }),
    ]);

    if (!profileDoc) {
      return HTTP_404_NOT_FOUND(res, "Profilo non trovato");
    }

    // Caching headers (facoltativi)
    const lastMod =
      (profileDoc as any).updatedAt ??
      (profileDoc as any).createdAt ??
      new Date();
    res.setHeader("Last-Modified", new Date(lastMod).toUTCString());
    res.setHeader(
      "ETag",
      `"profile-${profileDoc._id}-${new Date(lastMod).getTime()}"`
    );
    res.setHeader("Cache-Control", "private, must-revalidate");

    // Response con riepilogo referrals
    return HTTP_200_OK(res, {
      ok: true,
      profile: profileDoc,
      referrals: {
        total: totalReferrals,
        page,
        limit,
        count: referrals.length,
        emails: referrals.map((r) => r.email),
      },
    });
  } catch (err) {
    return HTTP_500_INTERNAL_SERVER_ERROR(
      res,
      "Errore nel recupero del profilo"
    );
  }
};
