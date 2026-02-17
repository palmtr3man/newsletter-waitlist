import { getDb } from "./db";
import { emailSequenceTracking, waitlistEntries, subscriberPreferences } from "../drizzle/schema";
import { eq, and, isNull, lt } from "drizzle-orm";
import { sendEmail } from "./email";

/**
 * Email Sequence Configuration
 * Defines the automated email sequence for new subscribers
 */
export const emailSequenceConfig = [
  {
    day: 1,
    type: "welcome" as const,
    subject: "Welcome to The Ultimate Journey 🚀",
    template: "welcome",
    description: "Day 1 welcome email from beehiiv draft",
  },
  {
    day: 3,
    type: "content_preview" as const,
    subject: "Exclusive Content Preview: What's Coming Next",
    template: "content_preview",
    description: "Day 3 content preview and insider tips",
  },
  {
    day: 7,
    type: "boarding_reminder" as const,
    subject: "Your Boarding Pass is Ready ✈️",
    template: "boarding_reminder",
    description: "Day 7 boarding reminder with flight details",
  },
  {
    day: 14,
    type: "exclusive_offer" as const,
    subject: "Exclusive Offer: Early Access to The Ultimate Journey",
    template: "exclusive_offer",
    description: "Day 14 exclusive offer for early adopters",
  },
];

/**
 * Process email sequence for all subscribers
 * Should be called by a scheduled job (cron) once per day
 */
export async function processEmailSequence() {
  const db = await getDb();
  if (!db) {
    console.error("[Email Sequence] Database not available");
    return;
  }

  console.log("[Email Sequence] Starting daily email sequence processing");

  for (const emailConfig of emailSequenceConfig) {
    try {
      await sendEmailsForDay(db, emailConfig);
    } catch (error) {
      console.error(`[Email Sequence] Error processing day ${emailConfig.day}:`, error);
    }
  }

  console.log("[Email Sequence] Daily email sequence processing complete");
}

/**
 * Send emails for a specific day in the sequence
 */
async function sendEmailsForDay(
  db: Awaited<ReturnType<typeof getDb>>,
  config: (typeof emailSequenceConfig)[number]
) {
  if (!db) return;

  // Find all subscribers who should receive this email
  // They should have:
  // 1. Created account exactly N days ago
  // 2. Not already received this email
  // 3. Not unsubscribed
  const nDaysAgo = new Date(Date.now() - config.day * 24 * 60 * 60 * 1000);
  const nDaysAgoPlus1 = new Date(Date.now() - (config.day - 1) * 24 * 60 * 60 * 1000);

  const eligibleSubscribers = await db
    .select()
    .from(waitlistEntries)
    .where(
      and(
        // Created between N and N-1 days ago
        lt(waitlistEntries.createdAt, nDaysAgoPlus1),
        // Not already sent this email
        isNull(
          db
            .select({ id: emailSequenceTracking.id })
            .from(emailSequenceTracking)
            .where(
              and(
                eq(emailSequenceTracking.waitlistEntryId, waitlistEntries.id),
                eq(emailSequenceTracking.emailType, config.type)
              )
            )
        )
      )
    );

  console.log(
    `[Email Sequence] Found ${eligibleSubscribers.length} subscribers for day ${config.day} (${config.type})`
  );

  for (const subscriber of eligibleSubscribers) {
    try {
      // Check subscriber preferences
      const prefs = await db
        .select()
        .from(subscriberPreferences)
        .where(eq(subscriberPreferences.waitlistEntryId, subscriber.id))
        .limit(1);

      if (prefs.length > 0 && prefs[0].unsubscribed) {
        console.log(`[Email Sequence] Subscriber ${subscriber.email} is unsubscribed, skipping`);
        continue;
      }

      // Send the email
      const emailContent = generateEmailContent(config.type, subscriber);
      await sendEmail({
        to: subscriber.email,
        subject: config.subject,
        html: emailContent.html,
        text: emailContent.text,
      });

      // Track the email send
      await db.insert(emailSequenceTracking).values({
        waitlistEntryId: subscriber.id,
        sequenceDay: config.day,
        emailType: config.type,
        sentAt: new Date(),
      });

      console.log(
        `[Email Sequence] Sent ${config.type} email to ${subscriber.email} (day ${config.day})`
      );
    } catch (error) {
      console.error(
        `[Email Sequence] Error sending ${config.type} email to ${subscriber.email}:`,
        error
      );
    }
  }
}

/**
 * Generate email content based on template type
 */
function generateEmailContent(
  type: (typeof emailSequenceConfig)[number]["type"],
  subscriber: typeof waitlistEntries.$inferSelect
) {
  const passengerName = subscriber.firstName || "Passenger";
  const queuePosition = subscriber.queuePosition;

  switch (type) {
    case "welcome":
      return {
        html: `
          <div style="font-family: Arial, sans-serif; background: linear-gradient(135deg, #0A0A0A 0%, #1a1a2e 100%); color: #fff; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: rgba(0, 217, 255, 0.1); border: 1px solid rgba(0, 217, 255, 0.3); border-radius: 12px; padding: 40px; backdrop-filter: blur(10px);">
              <h1 style="color: #00D9FF; margin-bottom: 20px;">Welcome to The Ultimate Journey ✈️</h1>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Hello ${passengerName},
              </p>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                You're now on the waitlist as passenger #${queuePosition}. Get ready for an extraordinary experience.
              </p>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Over the next two weeks, we'll be sharing exclusive content, insider tips, and special offers just for our early supporters.
              </p>
              <p style="font-size: 14px; color: #00D9FF; margin-top: 30px;">
                The Ultimate Journey Team
              </p>
            </div>
          </div>
        `,
        text: `Welcome to The Ultimate Journey\n\nHello ${passengerName},\n\nYou're now on the waitlist as passenger #${queuePosition}. Get ready for an extraordinary experience.\n\nOver the next two weeks, we'll be sharing exclusive content, insider tips, and special offers just for our early supporters.\n\nThe Ultimate Journey Team`,
      };

    case "content_preview":
      return {
        html: `
          <div style="font-family: Arial, sans-serif; background: linear-gradient(135deg, #0A0A0A 0%, #1a1a2e 100%); color: #fff; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: rgba(0, 217, 255, 0.1); border: 1px solid rgba(0, 217, 255, 0.3); border-radius: 12px; padding: 40px; backdrop-filter: blur(10px);">
              <h1 style="color: #00D9FF; margin-bottom: 20px;">Exclusive Content Preview 🎁</h1>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Hello ${passengerName},
              </p>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                As a valued member of our waitlist, you get exclusive access to behind-the-scenes content and insider tips.
              </p>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                This week, we're sharing insights on how to maximize your experience with The Ultimate Journey platform.
              </p>
              <p style="font-size: 14px; color: #00D9FF; margin-top: 30px;">
                The Ultimate Journey Team
              </p>
            </div>
          </div>
        `,
        text: `Exclusive Content Preview\n\nHello ${passengerName},\n\nAs a valued member of our waitlist, you get exclusive access to behind-the-scenes content and insider tips.\n\nThis week, we're sharing insights on how to maximize your experience with The Ultimate Journey platform.\n\nThe Ultimate Journey Team`,
      };

    case "boarding_reminder":
      return {
        html: `
          <div style="font-family: Arial, sans-serif; background: linear-gradient(135deg, #0A0A0A 0%, #1a1a2e 100%); color: #fff; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: rgba(0, 217, 255, 0.1); border: 1px solid rgba(0, 217, 255, 0.3); border-radius: 12px; padding: 40px; backdrop-filter: blur(10px);">
              <h1 style="color: #00D9FF; margin-bottom: 20px;">Your Boarding Pass is Ready ✈️</h1>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Hello ${passengerName},
              </p>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                We're getting closer to departure! Your boarding pass is ready, and we're preparing for launch.
              </p>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Passenger #${queuePosition}, you're in the queue. Stay tuned for exciting announcements coming your way.
              </p>
              <p style="font-size: 14px; color: #00D9FF; margin-top: 30px;">
                The Ultimate Journey Team
              </p>
            </div>
          </div>
        `,
        text: `Your Boarding Pass is Ready\n\nHello ${passengerName},\n\nWe're getting closer to departure! Your boarding pass is ready, and we're preparing for launch.\n\nPassenger #${queuePosition}, you're in the queue. Stay tuned for exciting announcements coming your way.\n\nThe Ultimate Journey Team`,
      };

    case "exclusive_offer":
      return {
        html: `
          <div style="font-family: Arial, sans-serif; background: linear-gradient(135deg, #0A0A0A 0%, #1a1a2e 100%); color: #fff; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: rgba(0, 217, 255, 0.1); border: 1px solid rgba(0, 217, 255, 0.3); border-radius: 12px; padding: 40px; backdrop-filter: blur(10px);">
              <h1 style="color: #00D9FF; margin-bottom: 20px;">Exclusive Offer for Early Adopters 🎉</h1>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                Hello ${passengerName},
              </p>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                As one of our earliest supporters, you're eligible for a special exclusive offer.
              </p>
              <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                This is your chance to get early access to The Ultimate Journey with special pricing and exclusive features.
              </p>
              <p style="font-size: 14px; color: #00D9FF; margin-top: 30px;">
                The Ultimate Journey Team
              </p>
            </div>
          </div>
        `,
        text: `Exclusive Offer for Early Adopters\n\nHello ${passengerName},\n\nAs one of our earliest supporters, you're eligible for a special exclusive offer.\n\nThis is your chance to get early access to The Ultimate Journey with special pricing and exclusive features.\n\nThe Ultimate Journey Team`,
      };

    default:
      return {
        html: "<p>Email content not available</p>",
        text: "Email content not available",
      };
  }
}

/**
 * Get email sequence status for a subscriber
 */
export async function getSubscriberSequenceStatus(waitlistEntryId: number) {
  const db = await getDb();
  if (!db) return null;

  const tracking = await db
    .select()
    .from(emailSequenceTracking)
    .where(eq(emailSequenceTracking.waitlistEntryId, waitlistEntryId));

  return tracking;
}
