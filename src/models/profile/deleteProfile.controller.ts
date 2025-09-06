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

/* ------------------------------ DELETE ------------------------------ */
export const deleteProfile = async (
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  try {
    const { profileId } = (res.locals.validated?.params ?? req.params) as {
      profileId: string;
    };

    if (!profileId || !isValidObjectId(profileId)) {
      return HTTP_400_BAD_REQUEST(res, "ObjectId non valido o mancante");
    }

    const existing = await Profile.findById(profileId).lean();
    if (!existing) {
      return HTTP_404_NOT_FOUND(res, "Profilo non trovato");
    }

    const deleted = await Profile.findByIdAndDelete(profileId).lean();
    if (!deleted) {
      return HTTP_404_NOT_FOUND(
        res,
        "Errore: profilo non trovato in fase di eliminazione"
      );
    }

    return HTTP_200_OK(res, {
      message: "Profilo eliminato con successo",
      profile: { _id: deleted._id, email: deleted.email },
    });
  } catch (err) {
    console.error("Errore eliminazione profilo:", err);
    return HTTP_500_INTERNAL_SERVER_ERROR(res, "Errore eliminazione profilo");
  }
};
