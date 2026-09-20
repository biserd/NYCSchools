CREATE TABLE `nyc_neighborhoods` (
	`nta_code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`borough` text NOT NULL,
	`source_url` text NOT NULL,
	`imported_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `nyc_neighborhood_aliases` (
	`alias` text NOT NULL,
	`nta_code` text NOT NULL,
	FOREIGN KEY (`nta_code`) REFERENCES `nyc_neighborhoods`(`nta_code`) ON UPDATE no action ON DELETE cascade,
	PRIMARY KEY(`alias`,`nta_code`)
);
--> statement-breakpoint
CREATE INDEX `nyc_neighborhood_alias_idx` ON `nyc_neighborhood_aliases` (`alias`);
--> statement-breakpoint
CREATE TABLE `school_neighborhoods` (
	`school_dbn` text PRIMARY KEY NOT NULL,
	`nta_code` text NOT NULL,
	`matched_at` integer NOT NULL,
	FOREIGN KEY (`school_dbn`) REFERENCES `schools`(`dbn`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`nta_code`) REFERENCES `nyc_neighborhoods`(`nta_code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `school_neighborhood_nta_idx` ON `school_neighborhoods` (`nta_code`);
--> statement-breakpoint
CREATE TABLE `parent_agent_contexts` (
	`user_id` text PRIMARY KEY NOT NULL,
	`last_action` text NOT NULL,
	`location_kind` text,
	`location_value` text,
	`location_label` text,
	`grade_level` text,
	`programs` text DEFAULT '[]' NOT NULL,
	`result_dbns` text DEFAULT '[]' NOT NULL,
	`expires_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `parent_agent_context_expiry_idx` ON `parent_agent_contexts` (`expires_at`);
--> statement-breakpoint
CREATE TABLE `parent_agent_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`model` text NOT NULL,
	`action` text NOT NULL,
	`tool` text NOT NULL,
	`outcome` text NOT NULL,
	`duration_ms` integer NOT NULL,
	`location_kind` text,
	`location_label` text,
	`grade_level` text,
	`result_count` integer NOT NULL,
	`used_context` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `parent_agent_runs_created_idx` ON `parent_agent_runs` (`created_at`);
--> statement-breakpoint
CREATE INDEX `parent_agent_runs_action_idx` ON `parent_agent_runs` (`action`,`created_at`);
