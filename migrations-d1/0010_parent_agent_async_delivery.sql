CREATE TABLE `parent_agent_deliveries` (
	`inbound_sid` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`claim_at` integer,
	`completed_at` integer,
	`provider_sid` text UNIQUE,
	`failure_code` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `parent_agent_deliveries_status_idx` ON `parent_agent_deliveries` (`status`,`created_at`);
--> statement-breakpoint
CREATE INDEX `parent_agent_deliveries_created_idx` ON `parent_agent_deliveries` (`created_at`);
