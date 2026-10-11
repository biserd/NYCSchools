CREATE TABLE `subscription_funnel_sessions` (
  `stripe_session_id` text PRIMARY KEY NOT NULL,
  `created_at` integer NOT NULL,
  `confirmed_paid_at` integer,
  `channel` text NOT NULL,
  `placement` text NOT NULL DEFAULT 'unknown',
  `first_landing_path` text,
  `utm_source` text,
  `utm_medium` text,
  `utm_campaign` text,
  `utm_content` text,
  `utm_term` text,
  `amount_cents` integer,
  `currency` text
);
--> statement-breakpoint
CREATE INDEX `subscription_funnel_sessions_created_idx` ON `subscription_funnel_sessions` (`created_at`);
--> statement-breakpoint
CREATE INDEX `subscription_funnel_sessions_paid_idx` ON `subscription_funnel_sessions` (`confirmed_paid_at`);
