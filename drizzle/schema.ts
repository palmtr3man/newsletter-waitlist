import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Newsletter Waitlist Table
 * Stores email signups with queue position and payment status
 */
export const waitlistEntries = mysqlTable("waitlist_entries", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  firstName: text("firstName"),
  queuePosition: int("queuePosition").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "completed", "failed", "skipped"]).default("pending").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  boardingPassSent: timestamp("boardingPassSent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WaitlistEntry = typeof waitlistEntries.$inferSelect;
export type InsertWaitlistEntry = typeof waitlistEntries.$inferInsert;

/**
 * Email Sequence Tracking Table
 * Tracks which emails in the automated sequence have been sent to each subscriber
 */
export const emailSequenceTracking = mysqlTable("email_sequence_tracking", {
  id: int("id").autoincrement().primaryKey(),
  waitlistEntryId: int("waitlistEntryId").notNull(),
  sequenceDay: int("sequenceDay").notNull(), // 1, 3, 7, 14
  emailType: mysqlEnum("emailType", ["welcome", "content_preview", "boarding_reminder", "exclusive_offer"]).notNull(),
  sentAt: timestamp("sentAt"),
  openedAt: timestamp("openedAt"),
  clickedAt: timestamp("clickedAt"),
  bounced: boolean("bounced").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EmailSequenceTracking = typeof emailSequenceTracking.$inferSelect;
export type InsertEmailSequenceTracking = typeof emailSequenceTracking.$inferInsert;

/**
 * Subscriber Preferences Table
 * Allows subscribers to manage their email preferences
 */
export const subscriberPreferences = mysqlTable("subscriber_preferences", {
  id: int("id").autoincrement().primaryKey(),
  waitlistEntryId: int("waitlistEntryId").notNull().unique(),
  emailFrequency: mysqlEnum("emailFrequency", ["daily", "weekly", "biweekly"]).default("weekly").notNull(),
  receivePromotional: boolean("receivePromotional").default(true),
  receiveProductUpdates: boolean("receiveProductUpdates").default(true),
  unsubscribed: boolean("unsubscribed").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SubscriberPreferences = typeof subscriberPreferences.$inferSelect;
export type InsertSubscriberPreferences = typeof subscriberPreferences.$inferInsert;

/**
 * Referral Tracking Table
 * Tracks referrals from existing subscribers
 */
export const referralTracking = mysqlTable("referral_tracking", {
  id: int("id").autoincrement().primaryKey(),
  referrerId: int("referrerId").notNull(), // waitlistEntryId of the person who referred
  referredId: int("referredId"), // waitlistEntryId of the person who was referred (null if not yet joined)
  referredEmail: varchar("referredEmail", { length: 320 }).notNull(),
  referralCode: varchar("referralCode", { length: 32 }).notNull().unique(),
  rewardClaimed: boolean("rewardClaimed").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ReferralTracking = typeof referralTracking.$inferSelect;
export type InsertReferralTracking = typeof referralTracking.$inferInsert;
