// src/modules/profile/profile.validators.ts
import { z } from "zod";
import { validateRequest } from "../middlewares/validateRequest";

/** Mongo ObjectId */
const MongoId = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "ObjectId non valido (24 hex)");

/** Enum regioni italiane (opzionale) */
export const ITALIAN_REGIONS = [
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

/* Helpers */
const Email = z.string().trim().toLowerCase().email();

const PhoneE164Like = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s-]/g, "")) // rimuovi spazi e trattini
  .refine((v) => /^(\+?[0-9]{6,20})$/.test(v), "Telefono non valido")
  .optional();

const VatIT = z
  .string()
  .trim()
  .regex(/^(IT)?\d{11}$/, "Partita IVA italiana non valida")
  .transform((v) => v.replace(/[\s.]/g, "").toUpperCase())
  .optional();

const ReferralCode = z.string().trim().min(4).max(24);

/* ----------------------------- REGISTER ----------------------------- */
export const RegisterProfileBody = z
  .object({
    email: Email,
    firstName: z.string().trim().min(1),
    lastName: z.string().trim().min(1),
    password: z.string().min(8, "Password troppo corta (min 8)"),
    user_id: z.coerce.number().int().positive().optional(),
    phone: PhoneE164Like,
    companyName: z.string().trim().min(1).max(200).optional(),
    vatNumber: VatIT,
    region: z.enum(ITALIAN_REGIONS).optional(),
    referredByCode: ReferralCode.optional(),
  })
  .strict();

export const RegisterProfileQuery = z
  .object({
    ref: ReferralCode.optional(),
  })
  .strict();

export const validateRegisterProfile = () =>
  validateRequest({ body: RegisterProfileBody, query: RegisterProfileQuery });

/* ------------------------------ LOGIN ------------------------------ */
export const loginSchema = z
  .object({
    email: Email,
    password: z.string().min(8, "Password troppo corta"),
    rememberMe: z.boolean().optional(),
  })
  .strict();

export const validateLogin = () => validateRequest({ body: loginSchema });

/* ------------------------------ LISTA ------------------------------ */
export const ListProfilesQuery = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    cursor: MongoId.optional(),
    sortBy: z
      .enum(["createdAt", "dateJoined", "lastLogin", "lastActivity"])
      .default("createdAt"),
    sortDir: z.enum(["asc", "desc"]).default("desc"),

    // filtri
    region: z.enum(ITALIAN_REGIONS).optional(),
    email: Email.optional(),
    companyName: z.string().trim().min(1).max(200).optional(),
    vatNumber: VatIT,
    referredBy: MongoId.optional(),
    ref: ReferralCode.optional(),
    q: z.string().trim().min(1).max(120).optional(),
  })
  .strict();

export const validateListProfiles = () =>
  validateRequest({ query: ListProfilesQuery });

/* ----------------------------- GET BY ID ---------------------------- */
export const GetProfileParams = z
  .object({
    profileId: MongoId,
  })
  .strict();

export const validateGetProfile = () =>
  validateRequest({ params: GetProfileParams });

/* ------------------------------ UPDATE ------------------------------ */
export const UpdateProfileBody = z
  .object({
    firstName: z.string().trim().min(1).max(100).optional(),
    lastName: z.string().trim().min(1).max(100).optional(),
    email: Email.optional(),
    phone: PhoneE164Like,
    companyName: z.string().trim().min(1).max(200).optional(),
    vatNumber: VatIT,
    region: z.enum(ITALIAN_REGIONS).optional(),
    signed: z.boolean().optional(),
    signedAt: z.coerce.date().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: "Nessun campo da aggiornare",
  });

export const validateUpdateProfile = () =>
  validateRequest({ params: GetProfileParams, body: UpdateProfileBody });

/* ------------------------------ DELETE ------------------------------ */
export const validateDeleteProfile = () =>
  validateRequest({ params: GetProfileParams });
