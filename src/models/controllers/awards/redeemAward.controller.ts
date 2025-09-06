import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../../../middlewares/auth";
import {
  HTTP_200_OK,
  HTTP_400_BAD_REQUEST,
  HTTP_401_UNAUTHORIZED,
  HTTP_404_NOT_FOUND,
  HTTP_500_INTERNAL_SERVER_ERROR,
} from "../../httpUtils";
import { MainAward } from "../../../database/schemas/schema.award";
import { TRedeemAwardParams } from "../../../validators/award.validators";

export const redeemAward = async (
  req: AuthRequest<TRedeemAwardParams>, // ✅ ora tipizzato
  res: Response
) => {
  try {
    const profileId = req.auth?.profileId;
    const { awardId } = req.params;

    if (!profileId || !mongoose.isValidObjectId(profileId)) {
      return HTTP_401_UNAUTHORIZED(res, "Profilo non autenticato o non valido");
    }

    if (!mongoose.isValidObjectId(awardId)) {
      return HTTP_400_BAD_REQUEST(res, "ID premio non valido");
    }

    const award = await MainAward.findOneAndUpdate(
      { _id: awardId, assignedTo: profileId, redeemed: false },
      { $set: { redeemed: true, redeemedAt: new Date() } },
      { new: true }
    ).lean();

    if (!award) {
      return HTTP_404_NOT_FOUND(res, "Premio non trovato o già riscattato");
    }

    return HTTP_200_OK(res, { ok: true, award });
  } catch (err) {
    console.error("Errore in redeemAward:", err);
    return HTTP_500_INTERNAL_SERVER_ERROR(res, "Errore riscatto premio");
  }
};
