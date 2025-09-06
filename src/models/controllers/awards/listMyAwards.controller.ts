import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../../../middlewares/auth";
import {
  HTTP_200_OK,
  HTTP_400_BAD_REQUEST,
  HTTP_401_UNAUTHORIZED,
  HTTP_500_INTERNAL_SERVER_ERROR,
} from "../../httpUtils";
import { MainAward } from "../../../database/schemas/schema.award";

export const listMyAwards = async (req: AuthRequest, res: Response) => {
  try {
    const profileId = req.auth?.profileId;

    if (!profileId || !mongoose.isValidObjectId(profileId)) {
      return HTTP_401_UNAUTHORIZED(res, "Profilo non autenticato o non valido");
    }

    // parsing sicuro parametri
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100); // cap a 100
    const skip = (page - 1) * limit;

    // conteggio totale
    const totalDocs = await MainAward.countDocuments({ assignedTo: profileId });

    // query paginata
    const awards = await MainAward.find({ assignedTo: profileId })
      .populate("assignedBy", "firstName lastName email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return HTTP_200_OK(res, {
      ok: true,
      totalDocs,
      page,
      limit,
      totalPages: Math.ceil(totalDocs / limit),
      count: awards.length,
      awards,
    });
  } catch (err: any) {
    console.error("Errore in listMyAwards:", err);

    if (err.name === "CastError") {
      return HTTP_400_BAD_REQUEST(res, "Parametro non valido");
    }

    return HTTP_500_INTERNAL_SERVER_ERROR(res, "Errore fetch premi utente");
  }
};
