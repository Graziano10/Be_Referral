// src/models/controllers/award/createAward.controller.ts
import { Request, Response } from "express";
import {
  HTTP_200_OK,
  HTTP_400_BAD_REQUEST,
  HTTP_404_NOT_FOUND,
  HTTP_500_INTERNAL_SERVER_ERROR,
} from "../../httpUtils";
import { MainAward } from "../../../database/schemas/schema.award";
import { Profile } from "../../../database";

export const createAward = async (req: Request, res: Response) => {
  try {
    const { title, description, points, assignedTo } = req.body;
    const assignedBy = req.auth?.profileId;

    if (!assignedBy) {
      return HTTP_400_BAD_REQUEST(res, "Profilo admin non trovato");
    }

    // Controllo se l'utente destinatario esiste
    const user = await Profile.findById(assignedTo).lean();
    if (!user) {
      return HTTP_404_NOT_FOUND(res, "Utente destinatario non trovato");
    }

    const award = await MainAward.create({
      title,
      description,
      points,
      assignedTo,
      assignedBy,
      redeemed: false,
      redeemedAt: null,
      paid: false, // 👈 nuovo campo
      paidAt: null, // 👈 nuovo campo
    });

    return HTTP_200_OK(res, {
      ok: true,
      message: "Premio assegnato con successo",
      award,
    });
  } catch (err) {
    console.error("Errore in createAward:", err);
    return HTTP_500_INTERNAL_SERVER_ERROR(res, "Errore creazione premio");
  }
};
