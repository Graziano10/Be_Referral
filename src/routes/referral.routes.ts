// src/routes/profile.routes.ts
import { Router } from "express";
import { createBankAccount } from "../models/controllers/bankAccount.controller";
import { authorizeToken } from "../middlewares/authorizeToken";
import { patchSignDocumentSelf } from "../models/controllers/patchSignDocumentSelf.controller";
import { getPaymentConfirmationData } from "../models/controllers/getBankAccount.controller";

export const referralRoutes = Router();

referralRoutes.post("/bank-accounts", authorizeToken, createBankAccount);

referralRoutes.patch("/sign", authorizeToken, patchSignDocumentSelf);

// referral/getConfirmationData?reveal=1
referralRoutes.get(
  "/getConfirmationData",
  authorizeToken,
  getPaymentConfirmationData
);
