import { Request, Response } from "express";
import { HTTP_200_OK, HTTP_500_INTERNAL_SERVER_ERROR } from "../../httpUtils";
import { MainAward } from "../../../database/schemas/schema.award";

// GET /awards → lista premi
export const listAwards = async (req: Request, res: Response) => {
  try {
    const { assignedTo, redeemed } = req.query as {
      assignedTo?: string;
      redeemed?: "true" | "false";
    };

    const filters: any = {};
    if (assignedTo) filters.assignedTo = assignedTo;
    if (redeemed) filters.redeemed = redeemed === "true";

    const awards = await MainAward.find(filters)
      .populate("assignedTo", "firstName lastName email")
      .populate("assignedBy", "firstName lastName email role")
      .sort({ createdAt: -1 })
      .lean();

    return HTTP_200_OK(res, {
      ok: true,
      total: awards.length,
      awards,
    });
  } catch (err) {
    console.error("Errore in listAwards:", err);
    return HTTP_500_INTERNAL_SERVER_ERROR(res, "Errore fetch premi");
  }
};
