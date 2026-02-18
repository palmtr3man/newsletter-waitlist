import { z } from "zod";
import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { waitlistEntries } from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import Stripe from "stripe";
import { sendPaymentReceiptEmail, sendBoardingPassEmail, sendInternalNotification } from "./email";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

/**
 * Get the next queue position for a new waitlist entry
 */
async function getNextQueuePosition(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(waitlistEntries)
    .orderBy(desc(waitlistEntries.queuePosition))
    .limit(1);

  return (result[0]?.queuePosition || 0) + 1;
}

/**
 * Create a Stripe checkout session for $0.01 payment
 */
export async function createCheckoutSession(
  email: string,
  firstName: string,
  origin: string,
  referralCode?: string
): Promise<string> {
  const queuePosition = await getNextQueuePosition();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "The Ultimate Journey - Newsletter Waitlist",
            description: "Join our exclusive newsletter and get your boarding pass",
          },
          unit_amount: 1, // $0.01 in cents
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    customer_email: email,
    client_reference_id: `waitlist-${email}`,
    metadata: {
      email,
      firstName,
      queuePosition: queuePosition.toString(),
      referralCode: referralCode || "",
    },
    success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/payment-cancel`,
    allow_promotion_codes: true,
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session");
  }

  return session.url;
}

/**
 * Handle successful payment and create waitlist entry
 */
export async function handlePaymentSuccess(
  sessionId: string
): Promise<{ email: string; queuePosition: number; referralCode: string; isVip: boolean; successfulReferrals: number }> {
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (!session.customer_email || !session.metadata?.email) {
    throw new Error("Missing email in session metadata");
  }

  const email = session.metadata.email;
  const firstName = session.metadata.firstName || "";
  const queuePosition = parseInt(session.metadata.queuePosition || "1", 10);
  const referralCodeFromSession = session.metadata.referralCode || undefined;

  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if already exists (idempotency guard)
  const existing = await db
    .select()
    .from(waitlistEntries)
    .where(eq(waitlistEntries.email, email))
    .limit(1);

  if (existing.length > 0) {
    return {
      email: existing[0].email,
      queuePosition: existing[0].queuePosition,
      referralCode: existing[0].referralCode || "",
      isVip: existing[0].isVip || false,
      successfulReferrals: existing[0].successfulReferrals || 0,
    };
  }

  // Create new waitlist entry
  const { generateReferralCode } = await import("./referral");
  const newEntry = await db.insert(waitlistEntries).values({
    email,
    firstName,
    queuePosition,
    paymentStatus: "completed",
    stripePaymentIntentId: session.payment_intent?.toString(),
    stripeCustomerId: session.customer?.toString(),
    boardingPassSent: new Date(),
  });

  // Generate referral code for new entry
  const lastInsertId = (newEntry as any).insertId || queuePosition;
  const referralCode = await generateReferralCode(lastInsertId);

  // Process referral if provided
  let isVip = false;
  let successfulReferrals = 0;
  if (referralCodeFromSession) {
    const { recordReferral } = await import("./referralTracking");
    try {
      const referralResult = await recordReferral(
        referralCodeFromSession,
        email,
        lastInsertId
      );
      if (referralResult.referrerPromotedToVip) {
        console.log(`[Referral] Referrer promoted to VIP`);
      }
    } catch (error) {
      console.warn(`[Referral] Failed to process referral`);
    }
  }

  // Send paid boarding pass email
  const paymentAmount = session.amount_total || 1;
  const paymentId = session.payment_intent?.toString() || session.id;
  await sendPaymentReceiptEmail(email, firstName, paymentAmount, paymentId, queuePosition);

  // Send internal notification
  await sendInternalNotification(email, firstName, "paid", paymentAmount);

  return {
    email,
    queuePosition,
    referralCode: referralCode || "",
    isVip,
    successfulReferrals,
  };
}

/**
 * Add email to waitlist without payment (fallback option)
 */
export async function addToWaitlistWithoutPayment(
  email: string,
  firstName: string
): Promise<{ queuePosition: number; referralCode: string; isVip: boolean; successfulReferrals: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if already exists (idempotency guard)
  const existing = await db
    .select()
    .from(waitlistEntries)
    .where(eq(waitlistEntries.email, email))
    .limit(1);

  if (existing.length > 0) {
    return {
      queuePosition: existing[0].queuePosition,
      referralCode: existing[0].referralCode || "",
      isVip: existing[0].isVip || false,
      successfulReferrals: existing[0].successfulReferrals || 0,
    };
  }

  const queuePosition = await getNextQueuePosition();
  const { generateReferralCode } = await import("./referral");
  const newEntry = await db.insert(waitlistEntries).values({
    email,
    firstName,
    queuePosition,
    paymentStatus: "skipped",
  });

  // Generate referral code for new entry
  const lastInsertId = (newEntry as any).insertId || queuePosition;
  const referralCode = await generateReferralCode(lastInsertId);

  // Send free boarding pass email
  await sendBoardingPassEmail(email, firstName, queuePosition);

  // Send internal notification
  await sendInternalNotification(email, firstName, "free");

  return {
    queuePosition,
    referralCode: referralCode || "",
    isVip: false,
    successfulReferrals: 0,
  };
}

/**
 * Get waitlist entry by email
 */
export async function getWaitlistEntry(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(waitlistEntries)
    .where(eq(waitlistEntries.email, email))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * Get total waitlist count
 */
export async function getTotalWaitlistCount(): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select()
    .from(waitlistEntries)
    .orderBy(desc(waitlistEntries.queuePosition))
    .limit(1);

  return result[0]?.queuePosition || 0;
}

/**
 * Payment router with tRPC procedures
 */
export const paymentRouter = router({
  createCheckout: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        firstName: z.string().optional(),
        referralCode: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const origin = ctx.req.headers.origin || "https://newsletter.thispagedoesnotexist12345.us";
      try {
        const checkoutUrl = await createCheckoutSession(
          input.email,
          input.firstName || "",
          origin,
          input.referralCode
        );
        return { checkoutUrl };
      } catch (error) {
        console.error("[Payment] Checkout creation failed:", error);
        throw new Error("Failed to create checkout session");
      }
    }),

  confirmPayment: publicProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ input }) => {
      try {
        const result = await handlePaymentSuccess(input.sessionId);
        return {
          email: result.email,
          queuePosition: result.queuePosition,
          referralCode: result.referralCode,
          isVip: result.isVip,
          successfulReferrals: result.successfulReferrals,
        };
      } catch (error) {
        console.error("[Payment] Payment confirmation failed:", error);
        throw new Error("Failed to confirm payment");
      }
    }),

  joinWaitlistWithoutPayment: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        firstName: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await addToWaitlistWithoutPayment(input.email, input.firstName || "");
        return {
          queuePosition: result.queuePosition,
          referralCode: result.referralCode,
          isVip: result.isVip,
          successfulReferrals: result.successfulReferrals,
        };
      } catch (error) {
        console.error("[Payment] Waitlist join failed:", error);
        throw new Error("Failed to join waitlist");
      }
    }),

  getEntry: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ input }) => {
      try {
        const entry = await getWaitlistEntry(input.email);
        return entry || null;
      } catch (error) {
        console.error("[Payment] Get entry failed:", error);
        return null;
      }
    }),

  getTotalCount: publicProcedure.query(async () => {
    try {
      return await getTotalWaitlistCount();
    } catch (error) {
      console.error("[Payment] Get count failed:", error);
      return 0;
    }
  }),
});
