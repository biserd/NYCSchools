CREATE TABLE `tuck_children` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`nickname` text NOT NULL,
	`school_dbn` text,
	FOREIGN KEY (`household_id`) REFERENCES `tuck_households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`school_dbn`) REFERENCES `schools`(`dbn`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tuck_child_household_key` ON `tuck_children` (`id`,`household_id`);--> statement-breakpoint
CREATE INDEX `tuck_children_household_idx` ON `tuck_children` (`household_id`);--> statement-breakpoint
CREATE TABLE `tuck_events` (
	`id` text PRIMARY KEY NOT NULL,
	`household_id` text NOT NULL,
	`child_id` text,
	`title` text NOT NULL,
	`date` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`household_id`) REFERENCES `tuck_households`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`child_id`,`household_id`) REFERENCES `tuck_children`(`id`,`household_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tuck_events_household_date_idx` ON `tuck_events` (`household_id`,`date`);--> statement-breakpoint
CREATE TABLE `tuck_households` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_user_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tuck_household_owner_key` ON `tuck_households` (`owner_user_id`);