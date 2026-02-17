import { getDb } from "./db";
import { waitlistEntries, referralTracking } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";

/**
 * Verify a referral code and get the referrer's information
 */
export async function verifyReferralCode(referralCode: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const referrer = await db
    .select()
    .from(waitlistEntries)
    .where(eq(waitlistEntries.referralCode, referralCode))
    .limit(1);

  return referrer.length > 0 ? referrer[0] : null;
}

/**
 * Record a successful referral and promote referrer to VIP if threshold met
 */
export async function recordReferral(
  referralCode: string,
  newUserEmail: string,
  newUserId: number
): Promise<{ success: boolean; referrerPromotedToVip: boolean }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Verify referral code exists
  const referrer = await verifyReferralCode(referralCode);
  if (!referrer) {
    throw new Error("Invalid referral code");
  }

  // Check if referral already exists for this email
  const existingReferral = await db
    .select()
    .from(referralTracking)
    .where(
      and(
        eq(referralTracking.referrerId, referrer.id),
        eq(referralTracking.referredEmail, newUserEmail)
      )
    )
    .limit(1);

  if (existingReferral.length > 0) {
    return { success: false, referrerPromotedToVip: false };
  }

  // Generate a unique referral code for the referred user
  const referredUserReferralCode = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

  // Record the referral
  await db.insert(referralTracking).values({
    referrerId: referrer.id,
    referredId: newUserId,
    referredEmail: newUserEmail,
    referralCode: referredUserReferralCode,
    joinedAt: new Date(),
  });

  // Update referrer's successful referral count
  const successfulReferrals = (referrer.successfulReferrals || 0) + 1;

  // Check if referrer should be promoted to VIP (3+ successful referrals)
  const shouldPromoteToVip = successfulReferrals >= 3 && !referrer.isVip;

  // Update referrer record
  await db
    .update(waitlistEntries)
    .set({
      successfulReferrals,
      isVip: shouldPromoteToVip ? true : referrer.isVip,
      updatedAt: new Date(),
    })
    .where(eq(waitlistEntries.id, referrer.id));

  return {
    success: true,
    referrerPromotedToVip: shouldPromoteToVip,
  };
}

/**
 * Get referral statistics for a user
 */
export async function getReferralStats(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const user = await db
    .select()
    .from(waitlistEntries)
    .where(eq(waitlistEntries.email, email))
    .limit(1);

  if (user.length === 0) {
    return null;
  }

  const referrals = await db
    .select()
    .from(referralTracking)
    .where(eq(referralTracking.referrerId, user[0].id));

  return {
    email: user[0].email,
    referralCode: user[0].referralCode,
    isVip: user[0].isVip,
    successfulReferrals: user[0].successfulReferrals || 0,
    referrals: referrals.map((r) => ({
      referredEmail: r.referredEmail,
      joinedAt: r.joinedAt,
    })),
  };
}

/**
 * Check if a user was referred and get referrer info
 */
export async function getRefererInfo(referralCode: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const referrer = await db
    .select()
    .from(waitlistEntries)
    .where(eq(waitlistEntries.referralCode, referralCode))
    .limit(1);

  if (referrer.length === 0) {
    return null;
  }

  return {
    referrerEmail: referrer[0].email,
    referrerName: referrer[0].firstName,
    referrerQueuePosition: referrer[0].queuePosition,
  };
}
