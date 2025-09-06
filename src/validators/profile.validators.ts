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
    region: z.enum(ITALIAN_REGIONS).optional(),
    referredByCode: ReferralCode.optional(),
    newsletter: z.boolean().optional(),

    // --- new fields ---
    city: z.string().trim().max(100).optional(),
    cap: z
      .string()
      .regex(/^\d{5}$/, "CAP non valido")
      .optional(),
    street: z.string().trim().max(200).optional(),
    codFiscale: z
      .string()
      .trim()
      .regex(/^[A-Z0-9]{11,16}$/i, "Codice Fiscale non valido")
      .optional(),

    isCompany: z.boolean().default(false),
    vatNumber: VatIT,
    businessName: z.string().trim().max(200).optional(),
    headquartersAddress: z.string().trim().max(300).optional(),
    ceoName: z.string().trim().max(200).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.isCompany) {
      if (!data.businessName) {
        ctx.addIssue({
          code: "custom",
          message: "Business name richiesto per aziende",
          path: ["businessName"],
        });
      }
      if (!data.headquartersAddress) {
        ctx.addIssue({
          code: "custom",
          message: "Headquarters address richiesto per aziende",
          path: ["headquartersAddress"],
        });
      }
      if (!data.ceoName) {
        ctx.addIssue({
          code: "custom",
          message: "CEO name richiesto per aziende",
          path: ["ceoName"],
        });
      }
    } else {
      if (!data.codFiscale) {
        ctx.addIssue({
          code: "custom",
          message: "Codice Fiscale richiesto per persone fisiche",
          path: ["codFiscale"],
        });
      }
    }
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
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce
      .number()
      .int()
      .refine((val) => [10, 20, 50].includes(val), {
        message: "Limit consentito: 10, 20, 50",
      })
      .default(10),

    cursor: MongoId.optional(),
    sortBy: z
      .enum([
        "createdAt",
        "dateJoined",
        "lastLogin",
        "lastActivity",
        "firstName",
        "lastName",
        "email",
        "businessName",
        "vatNumber",
        "city",
      ])
      .default("createdAt"),
    sortDir: z.enum(["asc", "desc"]).default("desc"),

    region: z.enum(ITALIAN_REGIONS).optional(),
    email: Email.optional(),
    vatNumber: VatIT,
    referredBy: MongoId.optional(),
    ref: ReferralCode.optional(),
    q: z.string().trim().min(1).max(120).optional(),

    type: z.enum(["azienda", "persona"]).optional(),
    verified: z.enum(["true", "false"]).optional(),
    newsletter: z.enum(["true", "false"]).optional(),
    role: z.enum(["superAdmin", "admin", "technician", "user"]).optional(),
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
    vatNumber: VatIT,
    region: z.enum(ITALIAN_REGIONS).optional(),

    isCompany: z.boolean().optional(),
    businessName: z.string().trim().max(200).optional(),
    headquartersAddress: z.string().trim().max(300).optional(),
    ceoName: z.string().trim().max(200).optional(),
    codFiscale: z
      .string()
      .trim()
      .regex(/^[A-Z0-9]{11,16}$/i, "Codice Fiscale non valido")
      .optional()
      .or(z.literal("").transform(() => undefined)), // 👈 consenti stringa vuota

    city: z.string().trim().max(100).optional(),
    cap: z
      .string()
      .regex(/^\d{5}$/, "CAP non valido")
      .optional(),
    street: z.string().trim().max(200).optional(),
    signed: z.boolean().optional(),
    signedAt: z.coerce.date().optional(),
    newsletter: z.boolean().optional(),
  })
  .strict()
  .refine((v) => Object.keys(v).length > 0, {
    message: "Nessun campo da aggiornare",
  })
  .superRefine((data, ctx) => {
    if (data.isCompany) {
      if (!data.businessName) {
        ctx.addIssue({
          code: "custom",
          message: "Business name richiesto per aziende",
          path: ["businessName"],
        });
      }
      if (!data.headquartersAddress) {
        ctx.addIssue({
          code: "custom",
          message: "Headquarters address richiesto per aziende",
          path: ["headquartersAddress"],
        });
      }
      if (!data.ceoName) {
        ctx.addIssue({
          code: "custom",
          message: "CEO name richiesto per aziende",
          path: ["ceoName"],
        });
      }
    } else {
      if (!data.codFiscale) {
        ctx.addIssue({
          code: "custom",
          message: "Codice Fiscale richiesto per persone fisiche",
          path: ["codFiscale"],
        });
      }
    }
  });

export const validateUpdateProfile = () =>
  validateRequest({ params: GetProfileParams, body: UpdateProfileBody });

/* ------------------------------ DELETE ------------------------------ */
export const validateDeleteProfile = () =>
  validateRequest({ params: GetProfileParams });

/* ------------------- ASSIGN ROLES ------------------- */
export const AssignRoleParams = z
  .object({
    profileId: MongoId,
  })
  .strict();

export const AssignRoleBody = z
  .object({
    role: z.enum(["user", "admin"] as const).refine((val) => !!val, {
      message: "Devi specificare un ruolo valido (user o admin)",
    }),
  })
  .strict();

export const validateAssignRole = () =>
  validateRequest({ params: AssignRoleParams, body: AssignRoleBody });
