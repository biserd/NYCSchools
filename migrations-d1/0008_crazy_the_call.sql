CREATE TABLE `parent_checkout_attempts` (
	`user_id` text PRIMARY KEY NOT NULL,
	`attempt_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
