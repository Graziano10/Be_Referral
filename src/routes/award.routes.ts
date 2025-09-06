import { Router } from "express";
import { authorizeToken } from "../middlewares/authorizeToken";
import { requireRole } from "../middlewares/requireRole";

import { createAward } from "../models/controllers/awards/awards.controller";
import { listAwards } from "../models/controllers/awards/listAwards.controller";
import {
  validateCreateAward,
  validateGetAwardById,
  validateGetAwards,
  validateMarkAwardAsPaid,
  validateRedeemAward,
} from "../validators/award.validators";
import { getAwardById } from "../models/controllers/awards/getAwardById.controller";
import { listMyAwards } from "../models/controllers/awards/listMyAwards.controller";
import { redeemAward } from "../models/controllers/awards/redeemAward.controller";
import { markAwardAsPaid } from "../models/controllers/awards/markAwardAsPaid.controller";

export const awardRoutes = Router();

// FOR DASHBOARD
awardRoutes.post(
  "/",
  authorizeToken,
  requireRole(["admin", "superAdmin"]),
  validateCreateAward(),
  createAward
);

// FOR DASHBOARD
awardRoutes.get(
  "/",
  authorizeToken,
  requireRole(["admin", "superAdmin"]),
  validateGetAwards(),
  listAwards
);

// FOR REGISTER
awardRoutes.get(
  "/me",
  authorizeToken, // qualsiasi user autenticato
  listMyAwards
);

// FOR REGISTER
awardRoutes.get(
  "/:awardId",
  authorizeToken,
  validateGetAwardById(),
  getAwardById
);

// FOR REGISTER AND DASHBOARD
awardRoutes.patch(
  "/:awardId/redeem",
  authorizeToken,
  validateRedeemAward(),
  redeemAward
);

// FOR DASHBOARD
// RESET AWARD AS PAID - SOLO ADMIN/SUPERADMIN
awardRoutes.patch(
  "/:awardId/paid",
  authorizeToken,
  requireRole(["admin", "superAdmin"]),
  validateMarkAwardAsPaid(),
  markAwardAsPaid
);
