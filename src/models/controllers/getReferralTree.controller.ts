// src/models/controllers/getReferralTree.controller.ts
import type { Request, Response } from "express";
import { Types, isValidObjectId } from "mongoose";
import { Profile } from "../../database/models";
import {
  HTTP_200_OK,
  HTTP_400_BAD_REQUEST,
  HTTP_404_NOT_FOUND,
  HTTP_500_INTERNAL_SERVER_ERROR,
} from "../httpUtils";
import { countReferrals } from "../services/referral.service";

export type ReferralNode = any & { children?: ReferralNode[] };

function buildTree(rootId: string, flat: ReferralNode[]): ReferralNode[] {
  const map = new Map<string, ReferralNode>();

  // copia e inizializza children
  flat.forEach((node) => {
    map.set(String(node._id), { ...node, children: [] });
  });

  const tree: ReferralNode[] = [];

  flat.forEach((node) => {
    if (node.referredBy && String(node.referredBy) !== rootId) {
      const parent = map.get(String(node.referredBy));
      if (parent) {
        parent.children!.push(map.get(String(node._id))!);
      }
    } else {
      // figli diretti del root
      tree.push(map.get(String(node._id))!);
    }
  });

  return tree;
}

export const getReferralTree = async (req: Request, res: Response) => {
  try {
    const { profileId } = (res.locals.validated?.params ?? req.params) as {
      profileId: string;
    };

    if (!isValidObjectId(profileId)) {
      return HTTP_400_BAD_REQUEST(res, {
        ok: false,
        message: "ID profilo non valido",
      });
    }

    const pid = new Types.ObjectId(profileId);

    const result = await Profile.aggregate([
      { $match: { _id: pid } },
      {
        $graphLookup: {
          from: "main_profile",
          startWith: "$_id",
          connectFromField: "_id",
          connectToField: "referredBy",
          as: "referralsTree",
          depthField: "level",
          maxDepth: 10,
        },
      },
      {
        $project: {
          firstName: 1,
          lastName: 1,
          email: 1,
          referralCode: 1,
          referredBy: 1,
          referralsTree: 1,
        },
      },
    ]);

    if (!result || result.length === 0) {
      return HTTP_404_NOT_FOUND(res, "Profilo non trovato");
    }

    const profile = result[0];
    const flatTree: ReferralNode[] = profile.referralsTree || [];

    // costruisco albero
    const tree = buildTree(profile._id.toString(), flatTree);

    const totalReferrals = countReferrals(tree);

    return HTTP_200_OK(res, {
      ok: true,
      profile: {
        ...profile,
        referralsTree: tree,
        totalReferrals,
      },
    });
  } catch (err) {
    console.error("getReferralTree error:", err);
    return HTTP_500_INTERNAL_SERVER_ERROR(
      res,
      "Errore nel recupero dell’albero referrals"
    );
  }
};
