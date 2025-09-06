// src/modules/profile/profile.service.ts
import { Profile } from "../../database";
import type { TProfileSchema } from "../../database";
import crypto from "crypto";

// Genera codice A–Z0–9 con sorgente cripto
function genReferralCode(len = 8): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const buf = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[buf[i] % alphabet.length];
  return out;
}

type CreateResult =
  | { conflict: true; field: "email" | "user_id" }
  | { conflict: false; doc: TProfileSchema };

// (opzionale) definisci un DTO con i soli campi ammessi
type CreateProfileDTO = {
  user_id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  region?: string;
  city?: string;
  cap?: string;
  street?: string;
  codFiscale?: string;
  isCompany?: boolean;
  vatNumber?: string;
  businessName?: string;
  headquartersAddress?: string;
  ceoName?: string;
};

export const ProfileService = {
  async create(
    data: CreateProfileDTO, // ← usa DTO esplicito
    refCode?: string
  ): Promise<CreateResult> {
    const email = data.email.trim().toLowerCase();

    // Pre-calcolo del parent referral (lean + projection minima)
    let referredBy: TProfileSchema["_id"] | null = null;
    if (refCode) {
      const parent = await Profile.findOne({
        referralCode: refCode.toUpperCase(),
      })
        .select("_id")
        .lean<{ _id: TProfileSchema["_id"] } | null>();
      referredBy = parent?._id ?? null;
    }

    // Retry su collisione referralCode, delegando la concorrenza all'indice unico
    const maxReferralRetries = 6;
    for (let attempt = 0; attempt < maxReferralRetries; attempt++) {
      try {
        const referralCode = genReferralCode(8);

        const created = await Profile.create({
          ...data,
          email,
          referredBy,
          // aggiungi referralAt se è previsto nello schema
          referralAt: referredBy ? new Date() : undefined,
          referralCode,
        } as Partial<TProfileSchema>);

        // OK
        return { conflict: false, doc: created.toObject() as TProfileSchema };
      } catch (err: any) {
        if (err?.code === 11000) {
          const key = Object.keys(err.keyValue ?? {})[0];
          // collisione referralCode → ritenta
          if (key === "referralCode") continue;
          // duplicato su email/user_id → segnala conflitto al controller
          if (key === "email") return { conflict: true, field: "email" };
          if (key === "user_id") return { conflict: true, field: "user_id" };
        }
        // altri errori → propaga
        throw err;
      }
    }

    throw new Error("Unable to generate a unique referral code after retries");
  },
};
