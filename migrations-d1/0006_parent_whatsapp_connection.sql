CREATE TABLE `parent_whatsapp_links` (
	`user_id` text PRIMARY KEY NOT NULL,
	`phone` text,
	`token_hash` text,
	`token_expires_at` integer,
	`token_issued_at` integer NOT NULL,
	`consent_at` integer,
	`last_inbound_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `parent_whatsapp_links_phone_unique` ON `parent_whatsapp_links` (`phone`);--> statement-breakpoint
CREATE UNIQUE INDEX `parent_whatsapp_links_token_hash_unique` ON `parent_whatsapp_links` (`token_hash`);--> statement-breakpoint
CREATE TABLE `parent_whatsapp_receipts` (
	`message_sid` text PRIMARY KEY NOT NULL,
	`received_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `parent_whatsapp_receipts_received_idx` ON `parent_whatsapp_receipts` (`received_at`);