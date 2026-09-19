CREATE TABLE `parent_drafts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`payload` text NOT NULL,
	`expires_at` integer NOT NULL,
	`confirmed_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `parent_preferences` (
	`user_id` text PRIMARY KEY NOT NULL,
	`timezone` text DEFAULT 'America/New_York' NOT NULL,
	`quiet_start` integer DEFAULT 21 NOT NULL,
	`quiet_end` integer DEFAULT 8 NOT NULL,
	`reminder_consent_at` integer,
	`ai_consent_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `parent_reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`event_id` text NOT NULL,
	`due_at` integer NOT NULL,
	`timezone` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`next_attempt_at` integer NOT NULL,
	`claim_at` integer,
	`message_sid` text,
	`failure_code` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`event_id`) REFERENCES `tuck_events`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `parent_reminders_message_sid_unique` ON `parent_reminders` (`message_sid`);--> statement-breakpoint
CREATE INDEX `parent_reminders_due_idx` ON `parent_reminders` (`status`,`next_attempt_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `parent_reminders_event_due_key` ON `parent_reminders` (`user_id`,`event_id`,`due_at`);--> statement-breakpoint
CREATE TABLE `parent_usage` (
	`user_id` text NOT NULL,
	`day` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `day`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
