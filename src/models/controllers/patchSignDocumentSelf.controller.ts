// src/models/controllers/patchSignDocumentSelf.controller.ts
import { Request, Response } from "express";
import { Profile } from "../../database/models";
import {
  HTTP_200_OK,
  HTTP_404_NOT_FOUND,
  HTTP_500_INTERNAL_SERVER_ERROR,
} from "../httpUtils";

export const patchSignDocumentSelf = async (req: Request, res: Response) => {
  try {
    const profileId = req.auth?.profileId; // assicurati dell'augmentation
    if (!profileId) return HTTP_404_NOT_FOUND(res, "Profilo non trovato");

    // 1) Idempotenza: se già firmato, ritorna lo stato attuale
    const current = await Profile.findById(profileId)
      .select("_id signed signedAt")
      .lean();

    if (!current) return HTTP_404_NOT_FOUND(res, "Profilo non trovato");

    if (current.signed) {
      return HTTP_200_OK(res, {
        ok: true,
        message: "Documento già firmato",
        profile: current,
      });
    }

    // 2) Firma ora (+ eventuale audit IP/UA)
    const doc = await Profile.findByIdAndUpdate(
      profileId,
      {
        signed: true,
        signedAt: new Date(),
        // signedIp: req.ip,            // se hai questi campi nel modello
        // signedUserAgent: req.headers["user-agent"],
      },
      { new: true, projection: "_id signed signedAt" }
    ).lean();

    if (!doc) return HTTP_404_NOT_FOUND(res, "Profilo non trovato");

    return HTTP_200_OK(res, {
      ok: true,
      message: "Documento firmato",
      profile: doc,
    });
  } catch {
    return HTTP_500_INTERNAL_SERVER_ERROR(res, "Errore firma documento");
  }
};
