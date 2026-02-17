CREATE TABLE `email_sequence_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`waitlistEntryId` int NOT NULL,
	`sequenceDay` int NOT NULL,
	`emailType` enum('welcome','content_preview','boarding_reminder','exclusive_offer') NOT NULL,
	`sentAt` timestamp,
	`openedAt` timestamp,
	`clickedAt` timestamp,
	`bounced` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_sequence_tracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referral_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrerId` int NOT NULL,
	`referredId` int,
	`referredEmail` varchar(320) NOT NULL,
	`referralCode` varchar(32) NOT NULL,
	`rewardClaimed` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `referral_tracking_id` PRIMARY KEY(`id`),
	CONSTRAINT `referral_tracking_referralCode_unique` UNIQUE(`referralCode`)
);
--> statement-breakpoint
CREATE TABLE `subscriber_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`waitlistEntryId` int NOT NULL,
	`emailFrequency` enum('daily','weekly','biweekly') NOT NULL DEFAULT 'weekly',
	`receivePromotional` boolean DEFAULT true,
	`receiveProductUpdates` boolean DEFAULT true,
	`unsubscribed` boolean DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriber_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriber_preferences_waitlistEntryId_unique` UNIQUE(`waitlistEntryId`)
);
