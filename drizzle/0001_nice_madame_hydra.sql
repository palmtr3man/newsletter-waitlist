CREATE TABLE `waitlist_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`firstName` text,
	`queuePosition` int NOT NULL,
	`paymentStatus` enum('pending','completed','failed','skipped') NOT NULL DEFAULT 'pending',
	`stripePaymentIntentId` varchar(255),
	`stripeCustomerId` varchar(255),
	`boardingPassSent` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `waitlist_entries_id` PRIMARY KEY(`id`),
	CONSTRAINT `waitlist_entries_email_unique` UNIQUE(`email`)
);
