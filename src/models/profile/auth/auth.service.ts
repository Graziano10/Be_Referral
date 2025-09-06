// src/modules/auth/auth.service.ts
import { AuthUser, Profile, Session } from "../../../database";
import { createAccessToken } from "../../httpUtils";
import { verifyPbkdf2Sha256Password } from "./password.utils";
import type { TProfileSchema, ProfileRole } from "../../../database/types";

/* ---------- Tipi di ritorno ---------- */
type Ok = {
  ok: true;
  token: string;
  profile: Pick<
    TProfileSchema,
    | "_id"
    | "user_id"
    | "firstName"
    | "lastName"
    | "email"
    | "phone"
    | "isCompany"
    | "businessName"
    | "vatNumber"
    | "headquartersAddress"
    | "ceoName"
    | "city"
    | "cap"
    | "street"
    | "codFiscale"
    | "region"
    | "verified"
    | "referralCode"
    | "referredBy"
    | "dateJoined"
    | "createdAt"
    | "updatedAt"
    | "role"
  >;
  authUser: {
    id: number;
    email: string;
    username: string;
    is_active: boolean;
    is_staff: boolean;
    last_login: Date | null;
  };
};

type Fail =
  | { ok: false; kind: "unauthorized" }
  | { ok: false; kind: "forbidden"; reason: "disabled" | "not_approved" }
  | { ok: false; kind: "internal" };

export const AuthService = {
  async login(
    email: string,
    password: string,
    ip: string,
    rememberMe = false
  ): Promise<Ok | Fail> {
    // 1) Normalizza email
    const normEmail = String(email).trim().toLowerCase();

    // 2) Trova auth_user
    const authUser = await AuthUser.findOne({ email: normEmail }).lean();
    if (!authUser?.password) {
      return { ok: false, kind: "unauthorized" };
    }

    // 3) Verifica password PBKDF2
    const valid = verifyPbkdf2Sha256Password(password, authUser.password);
    if (!valid) return { ok: false, kind: "unauthorized" };

    // 4) Stato account
    if (authUser.is_active === false) {
      return { ok: false, kind: "forbidden", reason: "disabled" };
    }

    // 5) Profilo associato
    const profile = await Profile.findOne({
      email: normEmail,
    }).lean<TProfileSchema>();
    if (!profile) return { ok: false, kind: "internal" };

    // 6) Token JWT (include ruolo del profilo)
    const token = createAccessToken({
      sub: String(authUser._id),
      profileId: String(profile._id),
      email: normEmail,
      uid: profile.user_id,
      role: [profile.role as ProfileRole],
      rememberMe,
    });

    // 7) Persisti sessione + aggiorna last_login (senza bloccare login in caso di errore)
    try {
      await Promise.all([
        Session.create({ profile: profile._id, lastAuthorizedIp: ip, token }),
        AuthUser.updateOne(
          { _id: authUser._id },
          { $set: { last_login: new Date() } }
        ).exec(),
        Profile.updateOne(
          { _id: profile._id },
          { $set: { lastLogin: new Date(), lastActivity: new Date() } }
        ).exec(),
      ]);
    } catch {
      // logging opzionale, non blocchiamo il login
    }

    // 8) Ritorno standardizzato
    return {
      ok: true,
      token,
      profile: {
        _id: profile._id,
        user_id: profile.user_id,
        firstName: profile.firstName,
        lastName: profile.lastName,
        email: profile.email,
        phone: profile.phone,
        isCompany: profile.isCompany,
        businessName: profile.businessName,
        vatNumber: profile.vatNumber,
        headquartersAddress: profile.headquartersAddress,
        ceoName: profile.ceoName,
        city: profile.city,
        cap: profile.cap,
        street: profile.street,
        codFiscale: profile.codFiscale,
        region: profile.region,
        verified: profile.verified,
        referralCode: profile.referralCode,
        referredBy: profile.referredBy,
        dateJoined: profile.dateJoined,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
        role: profile.role,
      },
      authUser: {
        id: authUser.id,
        email: authUser.email,
        username: authUser.username,
        is_active: authUser.is_active,
        is_staff: authUser.is_staff,
        last_login: authUser.last_login ?? null,
      },
    };
  },
};
