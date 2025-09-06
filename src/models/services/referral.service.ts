// src/services/referral.service.ts

import type { ReferralNode } from "../controllers/getReferralTree.controller";

export function countReferrals(nodes: ReferralNode[]): number {
  let count = 0;
  for (const n of nodes) {
    count += 1; // conta il nodo stesso
    if (n.children?.length) {
      count += countReferrals(n.children);
    }
  }
  return count;
}
