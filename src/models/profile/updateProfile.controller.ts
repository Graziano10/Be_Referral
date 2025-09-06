// src/modules/profile/profile.controller.ts
import type { Request, Response, NextFunction } from "express";
import { Profile } from "../../database/models";
import { isValidObjectId } from "mongoose";
import {
  HTTP_200_OK,
  HTTP_400_BAD_REQUEST,
  HTTP_404_NOT_FOUND,
  HTTP_500_INTERNAL_SERVER_ERROR,
} from "../httpUtils";

/* ------------------------------ UPDATE ------------------------------ */
export const updateProfile = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    // 1. Parametri
    const { profileId } = (res.locals?.validated?.params ?? req.params) as {
      profileId: string;
    };
    const updates = (res.locals?.validated?.body ?? req.body) as Record<
      string,
      any
    >;

    // 2. Validazione ID
    if (!profileId || !isValidObjectId(profileId)) {
      return HTTP_400_BAD_REQUEST(res, "ObjectId non valido o mancante");
    }

    // 3. Nessun campo fornito
    if (!updates || Object.keys(updates).length === 0) {
      return HTTP_400_BAD_REQUEST(res, "Nessun campo da aggiornare");
    }

    // 4. Verifica profilo esistente
    const existing = await Profile.findById(profileId).lean();
    if (!existing) {
      return HTTP_404_NOT_FOUND(res, "Profilo non trovato");
    }

    // 5. Definisci campi aggiornabili (whitelist)
    const allowedFields = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "region",
      "city",
      "cap",
      "street",
      "codFiscale",
      "isCompany",
      "businessName",
      "vatNumber",
      "headquartersAddress",
      "ceoName",
      "newsletter",
      "verified",
    ];

    const filteredUpdates: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in updates) {
        filteredUpdates[key] = updates[key];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return HTTP_400_BAD_REQUEST(res, "Nessun campo valido da aggiornare");
    }

    // 6. Esegui update
    const updated = await Profile.findByIdAndUpdate(
      profileId,
      { $set: filteredUpdates },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) {
      return HTTP_404_NOT_FOUND(
        res,
        "Errore: profilo non trovato in fase di aggiornamento"
      );
    }

    // 7. Risposta sicura
    const safeProfile = {
      _id: updated._id,
      user_id: updated.user_id,
      firstName: updated.firstName,
      lastName: updated.lastName,
      email: updated.email,
      phone: updated.phone,
      isCompany: updated.isCompany,
      businessName: updated.businessName,
      vatNumber: updated.vatNumber,
      headquartersAddress: updated.headquartersAddress,
      ceoName: updated.ceoName,
      city: updated.city,
      cap: updated.cap,
      street: updated.street,
      codFiscale: updated.codFiscale,
      region: updated.region,
      newsletter: updated.newsletter,
      verified: updated.verified,
      referralCode: updated.referralCode,
      referredBy: updated.referredBy,
      referralsCount: updated.referralsCount,
      updatedAt: updated.updatedAt,
    };

    return HTTP_200_OK(res, {
      message: "Profilo aggiornato con successo",
      profile: safeProfile,
    });
  } catch (err) {
    console.error("Errore aggiornamento profilo:", err);
    return HTTP_500_INTERNAL_SERVER_ERROR(res, "Errore aggiornamento profilo");
  }
};
