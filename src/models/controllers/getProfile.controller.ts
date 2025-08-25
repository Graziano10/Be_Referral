// src/modules/profile/profile.controller.ts
import { Request, Response } from "express";
import { HTTP_200_OK, HTTP_500_INTERNAL_SERVER_ERROR } from "../httpUtils";
import { Profile } from "../../database/models"; // <-- importa il modello main_profile
import { ListProfilesQuery } from "../../validators/profile.validators";

/**
 * GET /profiles
 * Restituisce lista profili con filtri/paginazione
 */
export const listProfiles = async (req: Request, res: Response) => {
  try {
    // Validazione query con Zod
    const query = ListProfilesQuery.parse(req.query);

    const {
      limit,
      cursor,
      sortBy,
      sortDir,
      region,
      email,
      companyName,
      vatNumber,
      referredBy,
      ref,
      q,
    } = query;

    const filters: any = {};

    if (region) filters.region = region;
    if (email) filters.email = email;
    if (companyName)
      filters.companyName = { $regex: companyName, $options: "i" };
    if (vatNumber) filters.vatNumber = vatNumber;
    if (referredBy) filters.referredBy = referredBy;
    if (ref) filters.referralCode = ref;

    // ricerca libera (nome o email)
    if (q) {
      filters.$or = [
        { firstName: { $regex: q, $options: "i" } },
        { lastName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
      ];
    }

    // paginazione a cursore (se passi cursor = _id)
    if (cursor) {
      filters._id = { $lt: cursor }; // ordiniamo desc di default
    }

    const profiles = await Profile.find(filters)
      .sort({ [sortBy!]: sortDir === "asc" ? 1 : -1 })
      .limit(limit!);

    return HTTP_200_OK(res, profiles);
  } catch (err: any) {
    console.error("Errore in listProfiles:", err);
    return HTTP_500_INTERNAL_SERVER_ERROR(
      res,
      "Errore durante il fetch dei profili"
    );
  }
};
