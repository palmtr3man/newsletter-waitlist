import { getDb } from "./db";
import { waitlistEntries, referralTracking } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

/**
 * Generate a unique referral code for a subscriber
 */
export async function generateReferralCode(waitlistEntryId: number): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  try {
    // Check if subscriber already has a referral code
    const entry = await db
      .select({ referralCode: waitlistEntries.referralCode })
      .from(waitlistEntries)
      .where(eq(waitlistEntries.id, waitlistEntryId))
      .limit(1);

    if (entry.length > 0 && entry[0].referralCode) {
      return entry[0].referralCode;
    }

    // Generate new referral code
    const referralCode = nanoid(8).toUpperCase();

    // Update waitlist entry with referral code
    await db
      .update(waitlistEntries)
      .set({ referralCode })
      .where(eq(waitlistEntries.id, waitlistEntryId));

    console.log(`[Referral] Generated referral code ${referralCode} for subscriber ${waitlistEntryId}`);
    return referralCode;
  } catch (error) {
    console.error("[Referral] Error generating referral code:", error);
    return null;
  }
}

/**
 * Create a referral invitation
 */
export async function createReferralInvitation(
  referrerId: number,
  referredEmail: string,
  referralCode: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    await db.insert(referralTracking).values({
      referrerId,
      referredEmail,
      referralCode,
    });

    console.log(`[Referral] Created referral invitation from ${referrerId} to ${referredEmail}`);
    return true;
  } catch (error) {
    console.error("[Referral] Error creating referral invitation:", error);
    return false;
  }
}

/**
 * Process a referral when someone joins with a referral code
 */
export async function processReferral(referralCode: string, newSubscriberId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  try {
    // Find the referral record
    const referral = await db
      .select()
      .from(referralTracking)
      .where(eq(referralTracking.referralCode, referralCode))
      .limit(1);

    if (referral.length === 0) {
      console.log(`[Referral] No referral found for code ${referralCode}`);
      return false;
    }

    const ref = referral[0];

    // Update referral tracking
    await db
      .update(referralTracking)
      .set({
        referredId: newSubscriberId,
        joinedAt: new Date(),
      })
      .where(eq(referralTracking.id, ref.id));

    // Increment successful referrals count for referrer
    const referrer = await db
      .select({ successfulReferrals: waitlistEntries.successfulReferrals })
      .from(waitlistEntries)
      .where(eq(waitlistEntries.id, ref.referrerId))
      .limit(1);

    if (referrer.length > 0) {
      const newCount = (referrer[0].successfulReferrals || 0) + 1;

      // Update referrer's successful referrals count
      await db
        .update(waitlistEntries)
        .set({
          successfulReferrals: newCount,
          isVip: true, // Automatically make referrer VIP
        })
        .where(eq(waitlistEntries.id, ref.referrerId));

      console.log(
        `[Referral] Processed referral: ${ref.referrerId} now has ${newCount} successful referrals and is VIP`
      );
    }

    return true;
  } catch (error) {
    console.error("[Referral] Error processing referral:", error);
    return false;
  }
}

/**
 * Get referral stats for a subscriber
 */
export async function getReferralStats(waitlistEntryId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const entry = await db
      .select({
        referralCode: waitlistEntries.referralCode,
        isVip: waitlistEntries.isVip,
        successfulReferrals: waitlistEntries.successfulReferrals,
      })
      .from(waitlistEntries)
      .where(eq(waitlistEntries.id, waitlistEntryId))
      .limit(1);

    if (entry.length === 0) return null;

    // Get list of successful referrals
    const referrals = await db
      .select({
        referredEmail: referralTracking.referredEmail,
        joinedAt: referralTracking.joinedAt,
      })
      .from(referralTracking)
      .where(
        and(
          eq(referralTracking.referrerId, waitlistEntryId),
          eq(referralTracking.referralCode, entry[0].referralCode || "")
        )
      );

    return {
      referralCode: entry[0].referralCode,
      isVip: entry[0].isVip,
      successfulReferrals: entry[0].successfulReferrals || 0,
      referrals: referrals.filter((r) => r.joinedAt !== null),
    };
  } catch (error) {
    console.error("[Referral] Error getting referral stats:", error);
    return null;
  }
}

/**
 * Get referral link for sharing
 */
export function getReferralLink(referralCode: string): string {
  const baseUrl = process.env.VITE_APP_URL || "https://newsletter.thispagedoesnotexist12345.us";
  return `${baseUrl}?ref=${referralCode}`;
}
