// src/modules/auth/auth.service.ts
import { AuthUser, Profile, Session } from "../../../database";
import { createAccessToken } from "../../httpUtils";
import { verifyPbkdf2Sha256Password } from "./password.utils";

type Ok = {
  ok: true;
  token: string;
  profile: any;
  authUser: any;
};

type Fail =
  | {
      ok: false;
      kind: "validation";
      errors: Array<{ path: string; message: string }>;
    }
  | { ok: false; kind: "unauthorized" }
  | { ok: false; kind: "forbidden"; reason: "disabled" | "not_approved" }
  | { ok: false; kind: "internal" };

export const AuthService = {
  async login(
    email: string,
    password: string,
    ip: string,
    rememberMe?: boolean
  ): Promise<Ok | Fail> {
    // Normalizza email per coerenza
    const normEmail = String(email).trim().toLowerCase();

    // 1) Trova auth_user
    const authUser = await AuthUser.findOne({ email: normEmail }).lean();
    if (!authUser || typeof authUser.password !== "string") {
      return { ok: false, kind: "unauthorized" };
    }

    // 2) Verifica password PBKDF2
    const valid = verifyPbkdf2Sha256Password(password, authUser.password);
    if (!valid) return { ok: false, kind: "unauthorized" };

    // 3) Stato account
    if (authUser.is_active === false) {
      return { ok: false, kind: "forbidden", reason: "disabled" };
    }
    // if (authUser.approved === false) return { ok: false, kind: "forbidden", reason: "not_approved" };

    // 4) Profilo associato
    const profile = await Profile.findOne({ email: normEmail });
    if (!profile) return { ok: false, kind: "internal" };

    // 5) Token (include profileId + campi opzionali coerenti col middleware)
    const token = createAccessToken({
      sub: String(authUser._id), // o String(profile._id) se preferisci
      profileId: String(profile._id), // IMPORTANTISSIMO per authorizeToken
      email: normEmail,
      uid: profile.user_id, // opzionale
      rememberMe: !!rememberMe, // opzionale
    });

    // 6) Persisti sessione + aggiorna last_login (non bloccare su fallimenti secondari)
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
      // non bloccare il login
    }

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
        companyName: profile.companyName,
        vatNumber: profile.vatNumber,
        region: profile.region,
        verified: (profile as any).verified ?? false,
        approved:
          (profile as any).approved ?? (profile as any).verified ?? false,
        referralCode: profile.referralCode,
        referredBy: profile.referredBy,
        dateJoined: profile.dateJoined,
        createdAt: profile.createdAt,
        updatedAt: profile.updatedAt,
      },
      authUser: {
        id: authUser.id,
        email: authUser.email,
        username: authUser.username,
        is_active: authUser.is_active,
        is_staff: authUser.is_staff,
        last_login: new Date(),
      },
    };
  },
};
