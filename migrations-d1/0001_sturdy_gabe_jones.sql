PRAGMA defer_foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_school_survey_releases` (
	`id` text PRIMARY KEY NOT NULL,
	`year` integer NOT NULL,
	`instrument` text NOT NULL,
	`source_url` text NOT NULL,
	`source_hash` text NOT NULL,
	`imported_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "school_survey_releases_year_check" CHECK("__new_school_survey_releases"."year" >= 2007),
	CONSTRAINT "school_survey_releases_instrument_check" CHECK("__new_school_survey_releases"."instrument" IN ('k12-family','k12-teacher','k12-student','b5-family','b5-teacher'))
);
--> statement-breakpoint
INSERT INTO `__new_school_survey_releases`("id", "year", "instrument", "source_url", "source_hash", "imported_at") SELECT "id", "year", "instrument", "source_url", "source_hash", "imported_at" FROM `school_survey_releases`;--> statement-breakpoint
DROP TABLE `school_survey_releases`;--> statement-breakpoint
ALTER TABLE `__new_school_survey_releases` RENAME TO `school_survey_releases`;--> statement-breakpoint
CREATE UNIQUE INDEX `school_survey_releases_year_instrument_key` ON `school_survey_releases` (`year`,`instrument`);--> statement-breakpoint
CREATE TABLE `__new_school_survey_results` (
	`release_id` text NOT NULL,
	`source_id` text NOT NULL,
	`source_name` text NOT NULL,
	`school_dbn` text,
	`center_id` integer,
	`response_count` integer,
	`response_rate` real,
	`metrics` text NOT NULL,
	`match_method` text NOT NULL,
	PRIMARY KEY(`release_id`, `source_id`),
	FOREIGN KEY (`release_id`) REFERENCES `school_survey_releases`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`school_dbn`) REFERENCES `schools`(`dbn`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`center_id`) REFERENCES `nyceec_centers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "school_survey_results_response_count_check" CHECK("__new_school_survey_results"."response_count" >= 0),
	CONSTRAINT "school_survey_results_response_rate_check" CHECK("__new_school_survey_results"."response_rate" >= 0 AND "__new_school_survey_results"."response_rate" <= 1),
	CONSTRAINT "school_survey_results_match_method_check" CHECK("__new_school_survey_results"."match_method" IN ('dbn','loc_code','loc_code_sems_code','unmatched'))
);
--> statement-breakpoint
INSERT INTO `__new_school_survey_results`("release_id", "source_id", "source_name", "school_dbn", "center_id", "response_count", "response_rate", "metrics", "match_method") SELECT "release_id", "source_id", "source_name", "school_dbn", "center_id", "response_count", "response_rate", "metrics", "match_method" FROM `school_survey_results`;--> statement-breakpoint
DROP TABLE `school_survey_results`;--> statement-breakpoint
ALTER TABLE `__new_school_survey_results` RENAME TO `school_survey_results`;--> statement-breakpoint
CREATE INDEX `school_survey_results_school_idx` ON `school_survey_results` (`school_dbn`);--> statement-breakpoint
CREATE INDEX `school_survey_results_center_idx` ON `school_survey_results` (`center_id`);
--> statement-breakpoint
PRAGMA defer_foreign_keys=OFF;
