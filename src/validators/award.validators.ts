import { z } from "zod";
import { MongoId } from "./shared";
import { validateRequest } from "../middlewares/validateRequest";

/**
 * =========================
 * GET /awards/:awardId
 * =========================
 */
export const GetAwardByIdParams = z
  .object({
    awardId: MongoId,
  })
  .strict();

export const validateGetAwardById = () =>
  validateRequest({ params: GetAwardByIdParams });

/**
 * =========================
 * POST /awards
 * =========================
 */
export const CreateAwardBody = z.object({
  title: z.string().trim().max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  points: z.number().int().nonnegative("I punti devono essere >= 0"),
  assignedTo: MongoId,
});

export const validateCreateAward = () =>
  validateRequest({ body: CreateAwardBody });

/**
 * =========================
 * GET /awards
 * =========================
 */
export const GetAwardsQuery = z
  .object({
    assignedTo: MongoId.optional(), // filtro per user
    redeemed: z.enum(["true", "false"]).optional(), // filtro riscattati / non riscattati
  })
  .strict();

export const validateGetAwards = () =>
  validateRequest({ query: GetAwardsQuery });

/**
 * =========================
 * PATCH /awards/:awardId/redeem
 * =========================
 */
export const RedeemAwardParams = z
  .object({
    awardId: MongoId,
  })
  .strict();

export const RedeemAwardResponse = z.object({
  ok: z.boolean(),
  award: z.object({
    _id: MongoId,
    title: z.string(),
    description: z.string().nullable().optional(),
    points: z.number(),
    assignedTo: MongoId,
    assignedBy: z
      .object({
        _id: MongoId,
        firstName: z.string().nullable().optional(),
        lastName: z.string().nullable().optional(),
        email: z.string().email().nullable().optional(),
        role: z.string().nullable().optional(),
      })
      .nullable()
      .optional(),
    redeemed: z.boolean(),
    redeemedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  }),
});

export const validateRedeemAward = () =>
  validateRequest({ params: RedeemAwardParams });

/**
 * =========================
 * PATCH /awards/:awardId/paid
 * =========================
 */
export const MarkAwardAsPaidParams = z
  .object({
    awardId: MongoId,
  })
  .strict();

export const MarkAwardAsPaidResponse = z.object({
  ok: z.boolean(),
  award: z.object({
    _id: MongoId,
    title: z.string(),
    points: z.number(),
    assignedTo: MongoId,
    paid: z.boolean(),
    paidAt: z.string().datetime().nullable(),
  }),
});

export const validateMarkAwardAsPaid = () =>
  validateRequest({ params: MarkAwardAsPaidParams });

// Tipi derivati
export type TMarkAwardAsPaidParams = z.infer<typeof MarkAwardAsPaidParams>;
export type TMarkAwardAsPaidResponse = z.infer<typeof MarkAwardAsPaidResponse>;
export type TCreateAwardResponse = z.infer<typeof CreateAwardBody>;
export type TGetAwardsQuery = z.infer<typeof GetAwardsQuery>;
export type TRedeemAwardParams = z.infer<typeof RedeemAwardParams>;
export type TRedeemAwardResponse = z.infer<typeof RedeemAwardResponse>;
