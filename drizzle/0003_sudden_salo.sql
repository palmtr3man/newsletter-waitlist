ALTER TABLE `referral_tracking` ADD `joinedAt` timestamp;--> statement-breakpoint
ALTER TABLE `waitlist_entries` ADD `referralCode` varchar(32);--> statement-breakpoint
ALTER TABLE `waitlist_entries` ADD `isVip` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `waitlist_entries` ADD `successfulReferrals` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `waitlist_entries` ADD CONSTRAINT `waitlist_entries_referralCode_unique` UNIQUE(`referralCode`);