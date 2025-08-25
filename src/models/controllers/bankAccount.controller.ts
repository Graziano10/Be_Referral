// src/models/controllers/bankAccount.controller.ts
import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  createBankAccountSchema,
  formatZodError,
  CreateBankAccountDto,
} from "../../validators/bankAccount.validator";
import { BankAccount } from "../../database/schemas/schema.bankAccount";
import { handleControllerError } from "../../utils/errorHandler";
import { Profile } from "../../database";

// Tipi minimi locali: non dipendiamo da augment globali
type AuthCtx = { profileId: string; email?: string };
type AuthReq = Request & { auth?: AuthCtx; body: CreateBankAccountDto };

export const createBankAccount = async (req: AuthReq, res: Response) => {
  try {
    // 1) Valida body (senza profileId)
    const parsed = createBankAccountSchema.parse(req.body);

    // 2) profileId dal contesto auth
    const profileIdStr = req.auth?.profileId;
    if (!profileIdStr) {
      return res.status(401).json({ message: "Missing profile context" });
    }
    const profileId = new mongoose.Types.ObjectId(profileIdStr);

    // 3) Email coerente col profilo: usa quella nel token se presente,
    //    altrimenti fai lookup sul profilo
    let profileEmail = req.auth?.email?.toLowerCase();
    if (!profileEmail) {
      const prof = await Profile.findById(profileId).select("email").lean();
      if (!prof)
        return res.status(404).json({ message: "Profilo non trovato" });
      profileEmail = String(prof.email).toLowerCase();
    }

    // Se il client ha passato email e non coincide → errore di coerenza
    if (parsed.email && parsed.email !== profileEmail) {
      return res
        .status(400)
        .json({ message: "Email non coerente con il profilo" });
    }

    // 4) Crea documento (lo schema cifra l’IBAN via virtual/middleware)
    const doc = await BankAccount.create({
      profileId,
      holderName: parsed.holderName,
      email: parsed.email ?? profileEmail, // forza email del profilo
      iban: parsed.iban, // virtual intercettato dal middleware
      bic: parsed.bic,
      bankName: parsed.bankName,
      country: parsed.country,
      currency: parsed.currency,
    });

    // 5) Risposta safe (+ Location)
    const json = doc.toJSON() as { id: string };
    res.setHeader("Location", `/bank-accounts/${json.id}`);
    return res.status(201).json(json);
  } catch (err: any) {
    if (err?.name === "ZodError") {
      return res
        .status(400)
        .json({ message: "Validation error", errors: formatZodError(err) });
    }
    if ((err as any)?.code === 11000 && (err as any)?.keyPattern?.iban_hash) {
      return res.status(409).json({ message: "IBAN già registrato" });
    }
    return handleControllerError(res, err);
  }
};
