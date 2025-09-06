import { Request, Response } from "express";
import { Profile } from "../../database/models";
import {
  HTTP_200_OK,
  HTTP_400_BAD_REQUEST,
  HTTP_404_NOT_FOUND,
  HTTP_500_INTERNAL_SERVER_ERROR,
} from "../httpUtils";

// Ruoli assegnabili solo tramite endpoint
const allowedRoles = ["user", "admin"] as const;

export const assignRole = async (req: Request, res: Response) => {
  try {
    const { profileId } = req.params;
    const { role } = req.body as { role?: string };

    if (!role) {
      return HTTP_400_BAD_REQUEST(res, "Devi specificare un ruolo");
    }

    // Impedisci l'assegnazione del superAdmin
    if (role === "superAdmin") {
      return HTTP_400_BAD_REQUEST(
        res,
        "Il ruolo superAdmin non può essere assegnato"
      );
    }

    if (!allowedRoles.includes(role as any)) {
      return HTTP_400_BAD_REQUEST(res, "Ruolo non valido (solo user o admin)");
    }

    const updated = await Profile.findByIdAndUpdate(
      profileId,
      { $set: { role } },
      { new: true }
    ).lean();

    if (!updated) {
      return HTTP_404_NOT_FOUND(res, "Profilo non trovato");
    }

    return HTTP_200_OK(res, {
      ok: true,
      message: "Ruolo aggiornato con successo",
      profile: {
        _id: updated._id,
        email: updated.email,
        role: updated.role,
      },
    });
  } catch (err) {
    console.error("Errore in assignRole:", err);
    return HTTP_500_INTERNAL_SERVER_ERROR(res, "Errore aggiornamento ruolo");
  }
};
