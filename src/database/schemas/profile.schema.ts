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

    companyName: { type: String, trim: true },
    vatNumber: {
      type: String,
      trim: true,
      match: [
        /^(IT)?\d{11}$/,
        "Partita IVA non valida (11 cifre, opz. prefisso IT)",
      ],
      index: true, // cerca veloce per P.IVA
      // unique: true, // <- attivalo solo se vuoi 1 profilo per P.IVA
    },

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

    signed: { type: Boolean, default: false, index: true },
    signedAt: { type: Date, default: null },

    verified: { type: Boolean, default: false },

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

ProfileSchema.index({ referredBy: 1, createdAt: -1 }); // lista diretti + paginazione
