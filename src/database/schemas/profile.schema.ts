import { Schema } from "mongoose";
import { TProfileSchema } from "../types";

const ITALIAN_REGIONS = [
  "Abruzzo",
  "Basilicata",
  "Calabria",
  "Campania",
  "Emilia-Romagna",
  "Friuli-Venezia Giulia",
  "Lazio",
  "Liguria",
  "Lombardia",
  "Marche",
  "Molise",
  "Piemonte",
  "Puglia",
  "Sardegna",
  "Sicilia",
  "Toscana",
  "Trentino-Alto Adige",
  "Umbria",
  "Valle d'Aosta",
  "Veneto",
] as const;

export type Role = "user" | "admin" | "superAdmin";

export const ProfileSchema = new Schema<TProfileSchema>(
  {
    user_id: { type: Number, required: true, unique: true, index: true },

    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: { type: String },

    // === Address fields ===
    city: { type: String, trim: true },
    cap: {
      type: String,
      trim: true,
      match: [/^\d{5}$/, "CAP non valido"],
    },
    codFiscale: {
      type: String,
      trim: true,
      match: [/^[A-Z0-9]{11,16}$/i, "Codice Fiscale non valido"],
      index: true,
    },
    street: { type: String, trim: true },

    // === Company fields ===
    isCompany: { type: Boolean, default: false, index: true },
    vatNumber: {
      type: String,
      trim: true,
      match: [
        /^(IT)?\d{11}$/,
        "Partita IVA non valida (11 cifre, opz. prefisso IT)",
      ],
      index: true,
    },
    businessName: { type: String, trim: true }, // ragione sociale
    headquartersAddress: { type: String, trim: true }, // indirizzo sede sociale
    ceoName: { type: String, trim: true }, // nome del CEO

    region: {
      type: String,
      enum: ITALIAN_REGIONS,
      required: false,
      index: true,
    },

    referralCode: { type: String, unique: true, sparse: true, index: true },
    referredBy: {
      type: Schema.Types.ObjectId,
      ref: "Profile",
      default: null,
      index: true,
    },
    referralsCount: { type: Number, default: 0, index: true },

    signed: { type: Boolean, default: false, index: true },
    signedAt: { type: Date, default: null },

    verified: { type: Boolean, default: false },
    newsletter: { type: Boolean, index: true },

    // ruolo
    role: {
      type: String,
      enum: ["user", "admin", "superAdmin"],
      default: "user", // 👈 sempre user di default
    },

    dateJoined: { type: Date, default: Date.now },
    lastLogin: { type: Date },
    lastLogout: { type: Date },
    lastActivity: { type: Date },
  },
  {
    collection: "main_profile",
    timestamps: true,
  }
);

ProfileSchema.index({ referredBy: 1, createdAt: -1 });
