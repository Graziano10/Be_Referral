// src/controllers/paymentConfirmation.controller.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import { BankAccount } from "../../database/schemas/schema.bankAccount";
import {
  HTTP_200_OK,
  HTTP_400_BAD_REQUEST,
  HTTP_401_UNAUTHORIZED,
  HTTP_404_NOT_FOUND,
  HTTP_500_INTERNAL_SERVER_ERROR,
} from "../httpUtils";
import {
  bankAccountOutputSchema,
  confirmationViewSchema,
  formatZodError,
} from "../../validators/bankAccount.validator";
import { decryptIban } from "../../utils/decryptIban";

const BANK_SECRET_KEY = process.env.BANK_SECRET_KEY || "";

type AuthCtx = { profileId: string; email?: string };
type AuthReq = Request & { auth?: AuthCtx };

function maskIban(iban: string) {
  const clean = iban.replace(/\s+/g, "");
  const head = clean.slice(0, 4);
  const tail = clean.slice(-4);
  const bodyLen = Math.max(clean.length - head.length - tail.length, 0);
  const maskedBody = "*".repeat(bodyLen);
  const grouped =
    (head + maskedBody + tail).match(/.{1,4}/g)?.join(" ") ??
    head + maskedBody + tail;
  return { ibanMasked: grouped, ibanLast4: tail };
}

export const getPaymentConfirmationData = async (
  req: AuthReq,
  res: Response
) => {
  try {
    // 1) Auth
    if (!req.auth?.profileId) {
      return HTTP_401_UNAUTHORIZED(res, { message: "Missing profile context" });
    }
    const profileIdStr = req.auth.profileId;
    if (!mongoose.Types.ObjectId.isValid(profileIdStr)) {
      return HTTP_400_BAD_REQUEST(res, { message: "ID profilo non valido" });
    }
    const profileId = new mongoose.Types.ObjectId(profileIdStr);

    // 2) Trova main (o ultimo)
    const doc = await BankAccount.findOne({ profileId })
      .sort({ isPrimary: -1, createdAt: -1 })
      .select("+iban_enc +iban_hash") // ← importante se select:false nello schema
      .exec();

    if (!doc)
      return HTTP_404_NOT_FOUND(res, {
        message: "Nessun conto bancario trovato",
      });
    if (!doc.iban_enc) {
      return HTTP_500_INTERNAL_SERVER_ERROR(res, {
        message: "IBAN cifrato mancante nel documento",
      });
    }
    if (!BANK_SECRET_KEY || BANK_SECRET_KEY.length !== 64) {
      return HTTP_500_INTERNAL_SERVER_ERROR(res, {
        message: "Chiave di cifratura IBAN non configurata",
      });
    }

    // 3) Decripta
    let decryptedIban: string;
    try {
      decryptedIban = decryptIban(doc.iban_enc, BANK_SECRET_KEY);
    } catch (err) {
      return HTTP_500_INTERNAL_SERVER_ERROR(res, {
        message: "Errore nella decifratura IBAN",
        error: (err as any)?.message || "Unknown",
      });
    }

    // 4) Valida pieno (con iban in chiaro solo in memoria)
    const parsedFull = bankAccountOutputSchema.safeParse({
      ...doc.toObject(),
      iban: decryptedIban,
    });
    if (!parsedFull.success) {
      return HTTP_500_INTERNAL_SERVER_ERROR(res, {
        message: "Errore interno: dati bancari non validi",
        errors: formatZodError(parsedFull.error),
      });
    }

    // 5) Decide formato risposta
    const reveal = String(req.query.reveal || "").trim() === "1";

    const base = {
      id: parsedFull.data._id.toString(),
      holderName: parsedFull.data.holderName,
      email: parsedFull.data.email,
      bankName: parsedFull.data.bankName ?? null,
      bic: parsedFull.data.bic ?? null,
      country: parsedFull.data.country ?? null,
      currency: parsedFull.data.currency ?? null,
      createdAt:
        parsedFull.data.createdAt instanceof Date
          ? parsedFull.data.createdAt
          : new Date(parsedFull.data.createdAt),
      updatedAt: doc.updatedAt instanceof Date ? doc.updatedAt : undefined,
      isPrimary: (doc as any).isPrimary ?? undefined,
    };

    const payload = reveal
      ? { ...base, iban: decryptedIban } // ← IBAN pieno
      : { ...base, ...maskIban(decryptedIban) }; // ← mascherato

    const safe = confirmationViewSchema.parse(payload);
    return HTTP_200_OK(res, safe);
  } catch (err) {
    return HTTP_500_INTERNAL_SERVER_ERROR(res, {
      message: "Errore interno imprevisto",
      error: (err as any)?.message || "Unknown",
    });
  }
};
