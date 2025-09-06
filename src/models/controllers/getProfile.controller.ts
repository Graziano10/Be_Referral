// src/modules/profile/profile.controller.ts
import { Request, Response } from "express";
import { HTTP_200_OK, HTTP_500_INTERNAL_SERVER_ERROR } from "../httpUtils";
import { Profile } from "../../database/models";
import { ListProfilesQuery } from "../../validators/profile.validators";

export const SAFE_FIELDS = [
  "_id",
  "user_id",
  "firstName",
  "lastName",
  "email",
  "phone",
  "isCompany",
  "businessName",
  "vatNumber",
  "headquartersAddress",
  "ceoName",
  "city",
  "cap",
  "street",
  "codFiscale",
  "region",
  "verified",
  "newsletter",
  "referralCode",
  "referredBy",
  "referralsCount",
  "signed",
  "signedAt",
  "role",
  "dateJoined",
  "createdAt",
  "updatedAt",
] as const;

export const listProfiles = async (req: Request, res: Response) => {
  try {
    const query = ListProfilesQuery.parse(req.query);
    const {
      limit,
      page,
      sortBy,
      sortDir,
      region,
      email,
      vatNumber,
      referredBy,
      ref,
      q,
      type,
      verified,
      newsletter,
      role, // 👈 nuovo filtro
    } = query;

    const filters: Record<string, unknown> = {};

    if (region) filters.region = region;
    if (email) filters.email = email;
    if (vatNumber) filters.vatNumber = vatNumber;
    if (referredBy) filters.referredBy = referredBy;
    if (ref) filters.referralCode = ref;

    // Newsletter
    if (newsletter === "true") filters.newsletter = true;
    else if (newsletter === "false") filters.newsletter = false;

    // Tipo soggetto
    if (type === "azienda") filters.isCompany = true;
    else if (type === "persona") filters.isCompany = false;

    // Verificato
    if (verified === "true") filters.verified = true;
    else if (verified === "false") filters.verified = false;

    // Ruolo
    if (role) filters.role = role;

    // Ricerca libera
    if (q) {
      filters.$or = [
        { firstName: { $regex: q, $options: "i" } },
        { lastName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { businessName: { $regex: q, $options: "i" } },
        { vatNumber: { $regex: q, $options: "i" } },
        { city: { $regex: q, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [totalDocs, docs] = await Promise.all([
      Profile.countDocuments(filters),
      Profile.find(filters)
        .select(SAFE_FIELDS.join(" "))
        .sort({ [sortBy]: sortDir === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limit),
    ]);

    return HTTP_200_OK(res, {
      docs,
      totalDocs,
      totalPages: Math.max(1, Math.ceil(totalDocs / limit)),
      page,
      limit,
    });
  } catch (err) {
    console.error("Errore in listProfiles:", err);
    return HTTP_500_INTERNAL_SERVER_ERROR(
      res,
      "Errore durante il fetch dei profili"
    );
  }
};
