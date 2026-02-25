/**
 * BMAC (Buy Me a Coffee) supporter-check stub.
 *
 * STUB — returns a fixed payload in the expected shape so the smoke test can
 * proceed without a live BMAC API key. Replace the body of `checkSupporter`
 * with the real BMAC API call during the Mar 4–6 implementation sprint.
 *
 * Expected response shape (truth table):
 *   has_supporter: boolean  — true if the email has any active BMAC record
 *   plan_type: "one_time" | "membership" | null
 *                           — "one_time"   for a single payment
 *                           — "membership" for a recurring subscription
 *                           — null         if no record found
 *   next_cursor: string | null
 *                           — pagination cursor for the next page of results
 *                             (null when no further pages exist)
 */

import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";

export interface BmacSupporterStatus {
  has_supporter: boolean;
  plan_type: "one_time" | "membership" | null;
  next_cursor: string | null;
}

/**
 * Stub implementation — always returns has_supporter: false.
 * Swap this out for the real BMAC API call in the Mar 4–6 sprint.
 */
async function checkSupporter(_email: string): Promise<BmacSupporterStatus> {
  // TODO (Mar 4–6): Replace with real BMAC API call.
  //   GET https://developers.buymeacoffee.com/api/v1/supporters
  //   Headers: { Authorization: `Bearer ${process.env.BMAC_API_KEY}` }
  //   Query:   { email: _email }
  //   Map one-time payments  → plan_type: "one_time"
  //   Map membership records → plan_type: "membership"
  //   Handle cursor-based pagination via `next_cursor` field.
  return {
    has_supporter: false,
    plan_type: null,
    next_cursor: null,
  };
}

export const bmacCheckRouter = router({
  /**
   * Check whether a given email address has an active BMAC supporter record.
   *
   * Usage (client):
   *   const result = await trpc.bmacCheck.check.query({ email: "user@example.com" });
   */
  check: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      const status = await checkSupporter(input.email);
      console.log(`[BMAC] Supporter check for ${input.email}:`, status);
      return status;
    }),
});
