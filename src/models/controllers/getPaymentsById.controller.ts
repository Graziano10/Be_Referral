// src/controllers/paymentConfirmation.controller.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import { BankAccount } from "../../database/schemas/schema.bankAccount";
import {
  HTTP_200_OK,
  HTTP_400_BAD_REQUEST,
  HTTP_401_UNAUTHORIZED,
  HTTP_403_FORBIDDEN,
  HTTP_404_NOT_FOUND,
  HTTP_500_INTERNAL_SERVER_ERROR,
} from "../httpUtils";
import {
  bankAccountOutputSchema,
  confirmationViewSchema,
  formatZodError,
} from "../../validators/bankAccount.validator";
import { decryptIban } from "../../utils/decryptIban";

type AuthCtx = { profileId: string; email?: string; role?: string[] };
type AuthReq = Request & { auth?: AuthCtx };

const BANK_SECRET_KEY = process.env.BANK_SECRET_KEY || "";

function isHex64(s: string) {
  return /^[0-9a-fA-F]{64}$/.test(s);
}

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

/**
 * GET /getConfirmationData/:profileId?reveal=1
 * Policy:
 *  - Senza reveal: owner o admin (a tua scelta anche tutti gli autenticati)
 *  - Con reveal=1: solo owner o ruoli elevati (es. admin)
 */
export const getPaymentsById = async (req: AuthReq, res: Response) => {
  try {
    // 1) Auth di base
    if (!req.auth?.profileId) {
      return HTTP_401_UNAUTHORIZED(res, { message: "Missing profile context" });
    }

    // 2) Validazione param
    const { profileId: profileIdParam } = req.params;
    if (!mongoose.Types.ObjectId.isValid(profileIdParam)) {
      return HTTP_400_BAD_REQUEST(res, { message: "ID profilo non valido" });
    }
    const profileId = new mongoose.Types.ObjectId(profileIdParam);

    // 3) Policy accesso
    const wantsReveal = String(req.query.reveal || "").trim() === "1";
    const isOwner = req.auth.profileId === String(profileId);
    const isAdmin = !!req.auth.role?.includes("admin");

    // - per sicurezza: senza reveal puoi decidere di permettere solo a owner/admin
    const canReadMasked = isOwner || isAdmin;
    if (!canReadMasked) {
      return HTTP_403_FORBIDDEN(res, { message: "Non autorizzato" });
    }

    // - con reveal serve owner o admin (personalizzabile)
    const canReveal = wantsReveal && (isOwner || isAdmin);
    if (wantsReveal && !canReveal) {
      return HTTP_403_FORBIDDEN(res, {
        message: "Non autorizzato a visualizzare l'IBAN completo",
      });
    }

    // 4) Precondizioni chiave
    if (!BANK_SECRET_KEY || !isHex64(BANK_SECRET_KEY)) {
      return HTTP_500_INTERNAL_SERVER_ERROR(res, {
        message: "Chiave di cifratura IBAN non configurata (hex 64)",
      });
    }

    // 5) Carica conto principale/ultimo - projection minima + lean
    const doc = await BankAccount.findOne({ profileId })
      .sort({ isPrimary: -1, updatedAt: -1, _id: -1 })
      .select(
        "holderName email bankName bic country currency isPrimary createdAt updatedAt iban_enc"
      )
      .lean()
      .exec();

    if (!doc) {
      return HTTP_404_NOT_FOUND(res, {
        message: "Nessun conto bancario trovato",
      });
    }
    if (!doc.iban_enc) {
      return HTTP_500_INTERNAL_SERVER_ERROR(res, {
        message: "IBAN cifrato mancante nel documento",
      });
    }

    // 6) Decripta
    let decryptedIban: string;
    try {
      decryptedIban = decryptIban(doc.iban_enc, BANK_SECRET_KEY);
    } catch (err) {
      return HTTP_500_INTERNAL_SERVER_ERROR(res, {
        message: "Errore nella decifratura IBAN",
        error: (err as any)?.message || "Unknown",
      });
    }

    // 7) Valida oggetto pieno (IBAN solo in memoria, non loggare)
    const parsedFull = bankAccountOutputSchema.safeParse({
      ...doc,
      _id: (doc as any)._id,
      iban: decryptedIban,
    });
    if (!parsedFull.success) {
      return HTTP_500_INTERNAL_SERVER_ERROR(res, {
        message: "Errore interno: dati bancari non validi",
        errors: formatZodError(parsedFull.error),
      });
    }

    // 8) Costruisci payload
    const base = {
      id: String((doc as any)._id),
      holderName: parsedFull.data.holderName,
      email: parsedFull.data.email,
      bankName: parsedFull.data.bankName ?? null,
      bic: parsedFull.data.bic ?? null,
      country: parsedFull.data.country ?? null,
      currency: parsedFull.data.currency ?? null,
      createdAt: new Date(parsedFull.data.createdAt).toISOString(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
      isPrimary: (doc as any).isPrimary ?? undefined,
    };

    const payload = canReveal
      ? { ...base, iban: decryptedIban }
      : { ...base, ...maskIban(decryptedIban) };

    // 9) Validazione vista pubblica
    const safe = confirmationViewSchema.parse(payload);

    // 10) Header sicurezza (no cache quando IBAN pieno)
    if (canReveal) {
      res.setHeader("Cache-Control", "no-store, max-age=0");
      // opzionale: audit log dell’evento di reveal
      // await Audit.log({ actor: req.auth.profileId, action: 'IBAN_REVEAL', target: String(profileId) });
    }

    return HTTP_200_OK(res, safe);
  } catch (err) {
    return HTTP_500_INTERNAL_SERVER_ERROR(res, {
      message: "Errore interno imprevisto",
      error: (err as any)?.message || "Unknown",
    });
  }
};
