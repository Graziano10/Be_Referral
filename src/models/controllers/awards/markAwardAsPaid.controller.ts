// src/models/controllers/award/markAwardAsPaid.controller.ts
import { Request, Response } from "express";
import {
  HTTP_200_OK,
  HTTP_400_BAD_REQUEST,
  HTTP_404_NOT_FOUND,
  HTTP_500_INTERNAL_SERVER_ERROR,
} from "../../httpUtils";
import { MainAward } from "../../../database/schemas/schema.award";

export const markAwardAsPaid = async (req: Request, res: Response) => {
  try {
    const { awardId } = (res.locals.validated?.params ?? req.params) as {
      awardId: string;
    };

    const award = await MainAward.findById(awardId);
    if (!award) {
      return HTTP_404_NOT_FOUND(res, "Premio non trovato");
    }

    if (award.paid) {
      return HTTP_400_BAD_REQUEST(res, "Premio già segnato come pagato");
    }

    award.paid = true;
    award.paidAt = new Date();
    await award.save();

    return HTTP_200_OK(res, {
      ok: true,
      message: "Premio segnato come pagato",
      award: {
        _id: award._id,
        title: award.title,
        points: award.points,
        assignedTo: award.assignedTo,
        paid: award.paid,
        paidAt: award.paidAt,
      },
    });
  } catch (err) {
    console.error("Errore in markAwardAsPaid:", err);
    return HTTP_500_INTERNAL_SERVER_ERROR(res, "Errore aggiornamento premio");
  }
};
