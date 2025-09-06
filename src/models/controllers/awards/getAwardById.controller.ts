// src/models/controllers/award/getAwardById.controller.ts
import { Request, Response } from "express";
import {
  HTTP_200_OK,
  HTTP_403_FORBIDDEN,
  HTTP_404_NOT_FOUND,
  HTTP_500_INTERNAL_SERVER_ERROR,
} from "../../httpUtils";
import { MainAward } from "../../../database/schemas/schema.award";

export const getAwardById = async (req: Request, res: Response) => {
  try {
    const { awardId } = req.params;
    const requester = req.auth; // preso da authorizeToken

    const award = await MainAward.findById(awardId)
      .populate("assignedTo", "firstName lastName email")
      .populate("assignedBy", "firstName lastName email role")
      .lean();

    if (!award) {
      return HTTP_404_NOT_FOUND(res, "Premio non trovato");
    }

    // 🔒 Restrizione: un "user" può vedere solo i propri premi
    if (
      requester?.role?.includes("user") &&
      String(award.assignedTo?._id) !== requester.profileId
    ) {
      return HTTP_403_FORBIDDEN(res, "Non hai i permessi per questo premio");
    }

    return HTTP_200_OK(res, {
      ok: true,
      award,
    });
  } catch (err) {
    console.error("Errore in getAwardById:", err);
    return HTTP_500_INTERNAL_SERVER_ERROR(res, "Errore fetch premio");
  }
};
