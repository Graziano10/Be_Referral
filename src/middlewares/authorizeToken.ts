// src/middlewares/authorizeToken.ts
import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload, TokenExpiredError } from "jsonwebtoken";
import env from "../config/env"; // deve esportare JWT_ACCESS_SECRET (string)
import { ProfileRole, TProfileSchema } from "../database/types";
import { Profile } from "../database/models";

/** Payload atteso nel JWT di accesso */
type AccessTokenPayload = JwtPayload & {
  email?: string;
  profileId?: string;
  sub?: string;
  role?: ProfileRole[];
};

/** Augment di Express Request */
declare module "express-serve-static-core" {
  interface Request {
    auth?: {
      profileId: string;
      email?: string;
      sub?: string;
      role?: string[];
      raw?: AccessTokenPayload;
    };
    profile?: Pick<
      TProfileSchema,
      "_id" | "email" | "firstName" | "lastName" | "verified" | "role"
    >;
  }
}

/**
 * Middleware di autorizzazione:
 * - Verifica Bearer token con JWT_ACCESS_SECRET
 * - Espone req.auth.{profileId,email,...}
 * - Se manca profileId nel token ma c'è email, fa lookup del profilo
 */ export const authorizeToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 0) Secret
    const ACCESS_SECRET =
      env?.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET;
    if (!ACCESS_SECRET) {
      return res.status(500).json({
        status: "error",
        message: "Server misconfigured (jwt secret)",
      });
    }

    // 1) Estrai Bearer (Express normalizza in lowercase: authorization)
    const hdr = req.headers.authorization;
    if (!hdr) {
      return res.status(401).json({
        status: "Unauthorized",
        details: "Missing Authorization header",
      });
    }
    const [scheme, token] = hdr.split(/\s+/);
    if (scheme?.toLowerCase() !== "bearer" || !token) {
      return res.status(401).json({
        status: "Unauthorized",
        details: "Invalid Authorization format",
      });
    }

    // 2) Verifica token con gestione errori specifici
    let payload: AccessTokenPayload;
    try {
      payload = jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        return res
          .status(401)
          .json({ status: "Unauthorized", details: "Token expired" });
      }
      return res
        .status(401)
        .json({ status: "Unauthorized", details: "Invalid token" });
    }

    // 3) Ricava profileId/email
    let { profileId, email } = payload;
    email = email ? String(email).toLowerCase() : undefined;

    // 4) Fallback via email (solo se proprio necessario: costa una query)
    if (!profileId) {
      if (!email) {
        return res
          .status(401)
          .json({ status: "Unauthorized", details: "Missing profile context" });
      }
      const prof = await Profile.findOne({ email })
        .select("_id email firstName lastName verified")
        .lean<{
          _id: any;
          email: string;
          firstName?: string;
          lastName?: string;
          verified: boolean;
          role: ProfileRole;
        }>();

      if (!prof) {
        return res
          .status(403)
          .json({ status: "Forbidden", details: "User not found or disabled" });
      }
      profileId =
        typeof prof._id === "string" ? prof._id : prof._id.toHexString();

      // opzionale: cache leggera del profilo in req
      req.profile = {
        _id: prof._id,
        email: prof.email,
        firstName: prof.firstName,
        lastName: prof.lastName,
        verified: prof.verified,
        role: prof.role,
      } as any;
    }

    if (!profileId) {
      return res
        .status(401)
        .json({ status: "Unauthorized", details: "Missing profile context" });
    }

    const profileIdStr = profileId as string; // ora è sicuramente definito

    // 5) Attacca contesto auth alla request
    req.auth = {
      profileId: profileIdStr,
      email,
      sub: payload.sub,
      role: Array.isArray(payload.role)
        ? payload.role
        : payload.role
        ? [payload.role]
        : [],
      raw: payload,
    };

    return next();
  } catch {
    return res
      .status(500)
      .json({ status: "error", message: "Internal server error" });
  }
};
