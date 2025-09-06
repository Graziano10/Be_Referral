import mongoose from "mongoose";
import { z, ZodError } from "zod";

/* --- costanti & util --- */
const IBAN_REGEX = /^[A-Z]{2}[0-9A-Z]{13,32}$/;
const BIC_REGEX = /^[A-Z0-9]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

function normalizeIban(raw: string) {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/** Verifica checksum IBAN (ISO 13616 / mod-97-10) */
function ibanChecksumValid(ibanRaw: string): boolean {
  const iban = normalizeIban(ibanRaw);
  if (!IBAN_REGEX.test(iban)) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const expanded = rearranged
    .split("")
    .map((ch) =>
      ch >= "A" && ch <= "Z" ? (ch.charCodeAt(0) - 55).toString() : ch
    )
    .join("");
  let remainder = 0;
  for (let i = 0; i < expanded.length; i += 7) {
    const block = remainder.toString() + expanded.slice(i, i + 7);
    remainder = Number(BigInt(block) % 97n);
  }
  return remainder === 1;
}

/* --- schema (ordine: trim/min/max/regex/refine, poi transform) --- */
export const createBankAccountSchema = z.object({
  holderName: z
    .string()
    .trim()
    .min(1, "Il nome intestatario non può essere vuoto.")
    .max(120, "Il nome intestatario non può superare 120 caratteri."),

  iban: z
    .string()
    .trim()
    .min(15, "L'IBAN deve essere lungo almeno 15 caratteri.")
    .max(34, "L'IBAN non può superare 34 caratteri.")
    .refine((s) => IBAN_REGEX.test(normalizeIban(s)), {
      message:
        "Formato IBAN non valido. Atteso: due lettere paese seguite da 13–32 caratteri alfanumerici.",
    })
    .refine((s) => ibanChecksumValid(s), {
      message: "IBAN non valido: checksum (mod‑97) fallita.",
    })
    // Solo alla fine, normalizziamo (UPPERCASE senza spazi)
    .transform((s) => normalizeIban(s)),
  email: z
    .string()
    .trim()
    .min(3, "Email troppo corta.")
    .max(254, "Email troppo lunga.")
    .refine((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s), "Email non valida.")
    .transform((s) => s.toLowerCase())
    .optional(),
  bic: z
    .string()
    .trim()
    .refine(
      (s) => !s || BIC_REGEX.test(s.toUpperCase()),
      "BIC/SWIFT non valido."
    )
    .transform((s) => (s ? s.toUpperCase() : s))
    .optional(),

  bankName: z
    .string()
    .trim()
    .max(150, "Il nome banca non può superare 150 caratteri.")
    .optional(),

  country: z
    .string()
    .trim()
    .min(2, "Il paese deve essere un codice ISO a 2 lettere (es. IT).")
    .max(2, "Il paese deve essere un codice ISO a 2 lettere (es. IT).")
    .transform((s) => s.toUpperCase())
    .optional(),

  currency: z
    .string()
    .trim()
    .min(3, "La valuta deve essere un codice ISO a 3 lettere (es. EUR).")
    .max(3, "La valuta deve essere un codice ISO a 3 lettere (es. EUR).")
    .transform((s) => s.toUpperCase())
    .optional(),
});

export type CreateBankAccountDto = z.infer<typeof createBankAccountSchema>;

/* --- helper: formattazione errori --- */
export function formatZodError(err: ZodError) {
  return err.issues.map((i) => ({
    field: i.path.join(".") || "root",
    message: i.message,
  }));
}

// Schema Zod per validazione del risultato da DB (protezione + consistenza)
export const bankAccountOutputSchema = z.object({
  _id: z.instanceof(mongoose.Types.ObjectId),
  holderName: z.string().min(2),
  email: z.string().email(),
  iban: z.string().min(10),
  bic: z.string().min(5),
  bankName: z.string().min(2),
  country: z.string().length(2), // ISO-2 (es. IT, FR)
  currency: z.string().length(3), // ISO-3 (es. EUR, USD)
  createdAt: z.date().or(z.string().transform((d) => new Date(d))),
});

const isoDate = z.string().datetime({ offset: true }); // accetta ISO 8601 con timezone
const dateLike = z.union([z.date(), isoDate]);

export const confirmationViewSchema = z
  .object({
    id: z.string(),
    holderName: z.string(),
    email: z.string().email().nullable(),
    bankName: z.string().nullable(),
    bic: z.string().nullable(),
    country: z.string().nullable(),
    currency: z.string().nullable(),

    // una delle due modalità:
    iban: z.string().optional(), // quando reveal=1
    ibanMasked: z.string().optional(), // quando mascherato
    ibanLast4: z.string().length(4).optional(),

    createdAt: dateLike,
    updatedAt: dateLike.nullable().optional(),
    isPrimary: z.boolean().optional(),
  })
  .refine((v) => !!v.iban || (!!v.ibanMasked && !!v.ibanLast4), {
    message: "Serve iban oppure ibanMasked+ibanLast4",
  });
