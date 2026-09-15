CREATE TABLE `admissions_metrics` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dbn` text NOT NULL,
	`school_year` text NOT NULL,
	`grade_band` text NOT NULL,
	`apps_per_seat` real,
	`true_apps_per_seat` real,
	`offer_rate` real,
	`true_offer_rate` real,
	`yield` real,
	`fill_rate` real,
	`estimated_yield` real,
	`estimated_fill_rate` real,
	`estimation_method` text,
	`seats_available` integer,
	`total_applicants` integer,
	`true_applicants` integer,
	`offers` integer,
	`enrolled` integer,
	`district_avg_yield` real,
	`computed_at` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX `idx_metrics_dbn` ON `admissions_metrics` (`dbn`);--> statement-breakpoint
CREATE INDEX `idx_metrics_year_grade` ON `admissions_metrics` (`school_year`,`grade_band`);--> statement-breakpoint
CREATE TABLE `admissions_offers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dbn` text NOT NULL,
	`school_year` text NOT NULL,
	`grade_band` text NOT NULL,
	`category` text NOT NULL,
	`seats_available` integer,
	`total_applicants` integer,
	`true_applicants` integer,
	`offers` integer,
	`is_suppressed` integer DEFAULT false,
	`source_file` text,
	`ingested_at` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX `idx_admissions_dbn` ON `admissions_offers` (`dbn`);--> statement-breakpoint
CREATE INDEX `idx_admissions_year_grade` ON `admissions_offers` (`school_year`,`grade_band`);--> statement-breakpoint
CREATE TABLE `ai_chat_messages` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `ai_chat_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_chat_messages_session` ON `ai_chat_messages` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_messages_created` ON `ai_chat_messages` (`created_at`);--> statement-breakpoint
CREATE TABLE `ai_chat_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`title` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_chat_sessions_user` ON `ai_chat_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_chat_sessions_created` ON `ai_chat_sessions` (`created_at`);--> statement-breakpoint
CREATE TABLE `api_abuse_alerts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key_id` integer NOT NULL,
	`alert_type` text NOT NULL,
	`alert_day` text NOT NULL,
	`detail` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`key_id`) REFERENCES `api_keys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_abuse_alerts_unique_per_day` ON `api_abuse_alerts` (`key_id`,`alert_type`,`alert_day`);--> statement-breakpoint
CREATE TABLE `api_key_rate_state` (
	`key_id` integer PRIMARY KEY NOT NULL,
	`minute_window_start` integer NOT NULL,
	`minute_count` integer DEFAULT 0 NOT NULL,
	`day_window_start` integer NOT NULL,
	`day_count` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`key_id`) REFERENCES `api_keys`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `api_keys` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`key_prefix` text NOT NULL,
	`key_hash` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_used_at` integer,
	`revoked_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `api_keys_key_hash_unique` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE INDEX `api_keys_user_idx` ON `api_keys` (`user_id`);--> statement-breakpoint
CREATE INDEX `api_keys_hash_idx` ON `api_keys` (`key_hash`);--> statement-breakpoint
CREATE TABLE `api_request_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`key_id` integer,
	`path` text NOT NULL,
	`status` integer NOT NULL,
	`ip` text,
	`response_time_ms` integer,
	`ts` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`key_id`) REFERENCES `api_keys`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `api_request_log_key_ts_idx` ON `api_request_log` (`key_id`,`ts`);--> statement-breakpoint
CREATE INDEX `api_request_log_ts_idx` ON `api_request_log` (`ts`);--> statement-breakpoint
CREATE INDEX `api_request_log_status_ts_idx` ON `api_request_log` (`status`,`ts`);--> statement-breakpoint
CREATE TABLE `app_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`description` text,
	`updated_at` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE TABLE `contact_submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`subject` text NOT NULL,
	`message` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`read` integer DEFAULT false
);
--> statement-breakpoint
CREATE INDEX `idx_contact_created` ON `contact_submissions` (`created_at`);--> statement-breakpoint
CREATE TABLE `enrollment_data` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dbn` text NOT NULL,
	`school_year` text NOT NULL,
	`grade` text NOT NULL,
	`enrolled` integer,
	`is_suppressed` integer DEFAULT false,
	`source_file` text,
	`ingested_at` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX `idx_enrollment_dbn` ON `enrollment_data` (`dbn`);--> statement-breakpoint
CREATE INDEX `idx_enrollment_year_grade` ON `enrollment_data` (`school_year`,`grade`);--> statement-breakpoint
CREATE TABLE `favorites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`school_dbn` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`school_dbn`) REFERENCES `schools`(`dbn`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `favorites_user_id_idx` ON `favorites` (`user_id`);--> statement-breakpoint
CREATE INDEX `favorites_user_school_idx` ON `favorites` (`user_id`,`school_dbn`);--> statement-breakpoint
CREATE TABLE `hs_admissions_program` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dbn` text NOT NULL,
	`program_number` integer NOT NULL,
	`program_name` text,
	`interest_area` text,
	`program_description` text,
	`eligibility` text,
	`admission_method` text,
	`grade9_ge_applicants` integer,
	`grade9_swd_applicants` integer,
	`seats_ge` integer,
	`seats_swd` integer,
	`applicants_per_seat_ge` real,
	`applicants_per_seat_swd` real,
	`filled_flag_ge` integer,
	`filled_flag_swd` integer,
	`seats_10plus` integer,
	`requirement_1` text,
	`requirement_2` text,
	`requirement_3` text,
	`requirement_4` text,
	`audition_info` text,
	`priority_1` text,
	`priority_2` text,
	`priority_3` text,
	`offer_rate_1` text,
	`offer_rate_2` text,
	`offer_rate_3` text,
	`specialized_code` text,
	`specialized_applicants` integer,
	`specialized_seats` integer,
	`specialized_apps_per_seat` real,
	`is_specialized` integer DEFAULT false,
	`school_name` text,
	`overview_paragraph` text,
	`academic_opportunities` text,
	`data_year` text DEFAULT '2025-26',
	`data_source` text DEFAULT 'NYC DOE HS Directory'
);
--> statement-breakpoint
CREATE INDEX `hs_admissions_dbn_idx` ON `hs_admissions_program` (`dbn`);--> statement-breakpoint
CREATE TABLE `hs_graduation` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dbn` text NOT NULL,
	`cohort_year` integer NOT NULL,
	`cohort_label` text,
	`total_cohort` integer,
	`grad_rate_4yr` real,
	`grad_rate_5yr` real,
	`grad_rate_6yr` real,
	`dropout_rate` real,
	`still_enrolled_rate` real,
	`diploma_regents_pct` real,
	`diploma_advanced_regents_pct` real,
	`diploma_local_pct` real,
	`ged_rate` real,
	`grad_rate_male` real,
	`grad_rate_female` real,
	`grad_rate_asian` real,
	`grad_rate_black` real,
	`grad_rate_hispanic` real,
	`grad_rate_white` real,
	`grad_rate_ell` real,
	`grad_rate_swd` real,
	`grad_rate_econ_disadv` real,
	`data_source` text DEFAULT 'NYC DOE InfoHub'
);
--> statement-breakpoint
CREATE INDEX `hs_grad_dbn_cohort_idx` ON `hs_graduation` (`dbn`,`cohort_year`);--> statement-breakpoint
CREATE TABLE `hs_regents` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dbn` text NOT NULL,
	`year` integer NOT NULL,
	`exam_name` text NOT NULL,
	`total_tested` integer,
	`pass_rate` real,
	`college_ready_rate` real,
	`mastery_rate` real,
	`mean_score` real,
	`pass_rate_male` real,
	`pass_rate_female` real,
	`pass_rate_asian` real,
	`pass_rate_black` real,
	`pass_rate_hispanic` real,
	`pass_rate_white` real,
	`pass_rate_ell` real,
	`pass_rate_swd` real,
	`pass_rate_econ_disadv` real,
	`data_source` text DEFAULT 'NYC DOE InfoHub'
);
--> statement-breakpoint
CREATE INDEX `hs_regents_dbn_year_idx` ON `hs_regents` (`dbn`,`year`);--> statement-breakpoint
CREATE INDEX `hs_regents_dbn_year_exam_idx` ON `hs_regents` (`dbn`,`year`,`exam_name`);--> statement-breakpoint
CREATE TABLE `magic_link_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `magic_link_tokens_hash_idx` ON `magic_link_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `magic_link_tokens_user_idx` ON `magic_link_tokens` (`user_id`);--> statement-breakpoint
CREATE TABLE `nyceec_ai_insights` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`loc_code` text NOT NULL,
	`overview` text NOT NULL,
	`considerations` text NOT NULL,
	`tour_questions` text NOT NULL,
	`neighborhood_context` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`loc_code`) REFERENCES `nyceec_centers`(`loc_code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nyceec_ai_insights_loc_code_unique` ON `nyceec_ai_insights` (`loc_code`);--> statement-breakpoint
CREATE INDEX `idx_nyceec_insights_loccode` ON `nyceec_ai_insights` (`loc_code`);--> statement-breakpoint
CREATE TABLE `nyceec_centers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`loc_code` text NOT NULL,
	`name` text NOT NULL,
	`center_type` text NOT NULL,
	`borough` text NOT NULL,
	`district` integer,
	`address` text NOT NULL,
	`zip_code` text,
	`latitude` real,
	`longitude` real,
	`nta` text,
	`phone` text,
	`email` text,
	`website` text,
	`seats` integer,
	`day_length` text,
	`extended_day` integer DEFAULT false,
	`meals_provided` integer DEFAULT false,
	`indoor_outdoor` text,
	`sems_code` text,
	`community_board` text,
	`council_district` text,
	`last_updated` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `nyceec_centers_loc_code_unique` ON `nyceec_centers` (`loc_code`);--> statement-breakpoint
CREATE INDEX `idx_nyceec_borough` ON `nyceec_centers` (`borough`);--> statement-breakpoint
CREATE INDEX `idx_nyceec_district` ON `nyceec_centers` (`district`);--> statement-breakpoint
CREATE INDEX `idx_nyceec_type` ON `nyceec_centers` (`center_type`);--> statement-breakpoint
CREATE INDEX `idx_nyceec_zip` ON `nyceec_centers` (`zip_code`);--> statement-breakpoint
CREATE TABLE `nyceec_reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`loc_code` text NOT NULL,
	`rating` integer NOT NULL,
	`review_text` text,
	`helpful_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`loc_code`) REFERENCES `nyceec_centers`(`loc_code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_nyceec_reviews_center` ON `nyceec_reviews` (`loc_code`);--> statement-breakpoint
CREATE INDEX `idx_nyceec_reviews_user` ON `nyceec_reviews` (`user_id`);--> statement-breakpoint
CREATE TABLE `nypd_complaints` (
	`cmplnt_num` text PRIMARY KEY NOT NULL,
	`complaint_date` integer NOT NULL,
	`law_cat_cd` text,
	`ofns_desc` text,
	`pd_desc` text,
	`borough` text,
	`latitude` real NOT NULL,
	`longitude` real NOT NULL
);
--> statement-breakpoint
CREATE INDEX `nypd_lat_idx` ON `nypd_complaints` (`latitude`);--> statement-breakpoint
CREATE INDEX `nypd_lng_idx` ON `nypd_complaints` (`longitude`);--> statement-breakpoint
CREATE INDEX `nypd_date_idx` ON `nypd_complaints` (`complaint_date`);--> statement-breakpoint
CREATE TABLE `oauth_access_tokens` (
	`token` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`client_id` text NOT NULL,
	`scope` text,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `oauth_access_tokens_user_idx` ON `oauth_access_tokens` (`user_id`);--> statement-breakpoint
CREATE TABLE `oauth_authorization_codes` (
	`code` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`client_id` text NOT NULL,
	`redirect_uri` text NOT NULL,
	`code_challenge` text NOT NULL,
	`code_challenge_method` text DEFAULT 'S256' NOT NULL,
	`scope` text,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `oauth_auth_codes_user_idx` ON `oauth_authorization_codes` (`user_id`);--> statement-breakpoint
CREATE TABLE `oauth_clients` (
	`client_id` text PRIMARY KEY NOT NULL,
	`client_secret` text,
	`client_name` text NOT NULL,
	`redirect_uris` text NOT NULL,
	`grant_types` text DEFAULT '["authorization_code"]',
	`response_types` text DEFAULT '["code"]',
	`token_endpoint_auth_method` text DEFAULT 'none',
	`scope` text,
	`client_uri` text,
	`logo_uri` text,
	`tos_uri` text,
	`policy_uri` text,
	`contacts` text,
	`client_id_issued_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`client_secret_expires_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `oauth_refresh_tokens` (
	`token` text PRIMARY KEY NOT NULL,
	`access_token` text NOT NULL,
	`user_id` text NOT NULL,
	`client_id` text NOT NULL,
	`scope` text,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `oauth_refresh_tokens_user_idx` ON `oauth_refresh_tokens` (`user_id`);--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `password_reset_tokens_hash_idx` ON `password_reset_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `password_reset_tokens_user_idx` ON `password_reset_tokens` (`user_id`);--> statement-breakpoint
CREATE TABLE `private_school_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nces_id` text NOT NULL,
	`school_year` integer NOT NULL,
	`enrollment` integer,
	`teachers_fte` real,
	`student_teacher_ratio` real,
	`tuition_elementary` integer,
	`tuition_middle` integer,
	`tuition_high` integer,
	`school_day_minutes` integer,
	`school_year_days` integer,
	`data_source_version` text,
	`created_at` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX `private_school_history_nces_year_idx` ON `private_school_history` (`nces_id`,`school_year`);--> statement-breakpoint
CREATE TABLE `private_schools` (
	`nces_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`address` text NOT NULL,
	`city` text NOT NULL,
	`state` text DEFAULT 'NY' NOT NULL,
	`zip_code` text,
	`phone` text,
	`website` text,
	`borough` text,
	`neighborhood` text,
	`latitude` real,
	`longitude` real,
	`bbl` text,
	`bin` text,
	`grades_offered` text,
	`lowest_grade` text,
	`highest_grade` text,
	`enrollment` integer,
	`enrollment_by_grade` text,
	`teachers_fte` real,
	`student_teacher_ratio` real,
	`coed_status` text,
	`religious_affiliation` text,
	`religious_orientation` text,
	`is_religious` integer DEFAULT false,
	`program_emphasis` text,
	`school_type` text,
	`has_extended_day` integer DEFAULT false,
	`school_day_minutes` integer,
	`school_year_days` integer,
	`tuition_elementary` integer,
	`tuition_middle` integer,
	`tuition_high` integer,
	`has_financial_aid` integer DEFAULT false,
	`financial_aid_percent` integer,
	`asian_percent` real,
	`black_percent` real,
	`hispanic_percent` real,
	`white_percent` real,
	`pacific_islander_percent` real,
	`american_indian_percent` real,
	`multi_racial_percent` real,
	`has_library` integer,
	`associations` text,
	`accreditation` text,
	`network_affiliation` text,
	`application_deadline` text,
	`has_rolling_admissions` integer DEFAULT false,
	`admissions_selectivity` text,
	`requires_interview` integer DEFAULT false,
	`requires_testing` integer DEFAULT false,
	`testing_types` text,
	`data_source_year` integer,
	`data_source_version` text,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	`updated_at` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX `private_schools_borough_idx` ON `private_schools` (`borough`);--> statement-breakpoint
CREATE INDEX `private_schools_zip_idx` ON `private_schools` (`zip_code`);--> statement-breakpoint
CREATE INDEX `private_schools_religious_idx` ON `private_schools` (`religious_affiliation`);--> statement-breakpoint
CREATE TABLE `processed_webhook_events` (
	`event_id` text PRIMARY KEY NOT NULL,
	`event_type` text NOT NULL,
	`processed_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `processed_webhook_events_type_idx` ON `processed_webhook_events` (`event_type`);--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`school_dbn` text NOT NULL,
	`rating` integer NOT NULL,
	`review_text` text,
	`helpful_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`school_dbn`) REFERENCES `schools`(`dbn`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_reviews_school` ON `reviews` (`school_dbn`);--> statement-breakpoint
CREATE INDEX `idx_reviews_user` ON `reviews` (`user_id`);--> statement-breakpoint
CREATE TABLE `school_attendance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dbn` text NOT NULL,
	`year` text NOT NULL,
	`grade` text DEFAULT 'All Grades' NOT NULL,
	`total_days` integer,
	`days_absent` integer,
	`days_present` integer,
	`attendance_rate` real,
	`students_contributing` integer,
	`chronically_absent_count` integer,
	`chronic_absenteeism_rate` real,
	`ca_rate_swd` real,
	`ca_rate_not_swd` real,
	`ca_rate_asian` real,
	`ca_rate_black` real,
	`ca_rate_hispanic` real,
	`ca_rate_white` real,
	`ca_rate_other` real,
	`ca_rate_male` real,
	`ca_rate_female` real,
	`ca_rate_poverty` real,
	`ca_rate_not_poverty` real,
	`ca_rate_ell` real,
	`ca_rate_not_ell` real,
	`ca_rate_sth` real,
	`ca_rate_not_sth` real,
	`data_source` text DEFAULT 'NYC DOE InfoHub'
);
--> statement-breakpoint
CREATE INDEX `school_attendance_dbn_year_idx` ON `school_attendance` (`dbn`,`year`);--> statement-breakpoint
CREATE TABLE `school_discipline` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dbn` text NOT NULL,
	`year` text NOT NULL,
	`school_name` text,
	`category` text,
	`total_suspensions` integer,
	`teacher_removals` integer,
	`principal_suspensions` integer,
	`superintendent_suspensions` integer,
	`susp_black` integer,
	`susp_hispanic` integer,
	`susp_white` integer,
	`susp_asian` integer,
	`susp_multi_racial` integer,
	`susp_native_american` integer,
	`susp_male` integer,
	`susp_female` integer,
	`susp_swd` integer,
	`susp_gen_ed` integer,
	`susp_ell` integer,
	`susp_non_ell` integer,
	`susp_sth` integer,
	`susp_non_sth` integer,
	`data_source` text DEFAULT 'NYC DOE InfoHub LL93'
);
--> statement-breakpoint
CREATE INDEX `school_discipline_dbn_year_idx` ON `school_discipline` (`dbn`,`year`);--> statement-breakpoint
CREATE TABLE `school_historical_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dbn` text NOT NULL,
	`year` integer NOT NULL,
	`ela_proficiency` integer,
	`math_proficiency` integer,
	`science_proficiency` integer,
	`ela_tested_count` integer,
	`ela_eligible_count` integer,
	`ela_participation_rate` integer,
	`math_tested_count` integer,
	`math_eligible_count` integer,
	`math_participation_rate` integer,
	`data_source` text,
	`data_source_release` text
);
--> statement-breakpoint
CREATE INDEX `historical_dbn_year_idx` ON `school_historical_scores` (`dbn`,`year`);--> statement-breakpoint
CREATE TABLE `school_safety_index` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`school_type` text NOT NULL,
	`school_key` text NOT NULL,
	`radius_meters` integer NOT NULL,
	`period_start` integer NOT NULL,
	`period_end` integer NOT NULL,
	`total_reports` integer DEFAULT 0 NOT NULL,
	`felony_reports` integer DEFAULT 0 NOT NULL,
	`violent_felony_reports` integer DEFAULT 0 NOT NULL,
	`misdemeanor_reports` integer DEFAULT 0 NOT NULL,
	`violation_reports` integer DEFAULT 0 NOT NULL,
	`top_categories` text DEFAULT '[]' NOT NULL,
	`weighted_risk_score` real DEFAULT 0 NOT NULL,
	`safety_index` integer DEFAULT 50 NOT NULL,
	`percentile_citywide` integer,
	`trend` text,
	`trend_delta` real,
	`prior_period_total` integer,
	`last_calculated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `safety_school_radius_unique` ON `school_safety_index` (`school_type`,`school_key`,`radius_meters`);--> statement-breakpoint
CREATE INDEX `safety_radius_idx` ON `school_safety_index` (`radius_meters`);--> statement-breakpoint
CREATE TABLE `school_survey_releases` (
	`id` text PRIMARY KEY NOT NULL,
	`year` integer NOT NULL,
	`instrument` text NOT NULL,
	`source_url` text NOT NULL,
	`source_hash` text NOT NULL,
	`imported_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `school_survey_releases_year_instrument_key` ON `school_survey_releases` (`year`,`instrument`);--> statement-breakpoint
CREATE TABLE `school_survey_results` (
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
	FOREIGN KEY (`center_id`) REFERENCES `nyceec_centers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `school_survey_results_school_idx` ON `school_survey_results` (`school_dbn`);--> statement-breakpoint
CREATE INDEX `school_survey_results_center_idx` ON `school_survey_results` (`center_id`);--> statement-breakpoint
CREATE TABLE `school_zones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`dbn` text NOT NULL,
	`school_name` text,
	`district` integer,
	`grade_level` text NOT NULL,
	`geometry` text NOT NULL,
	`remarks` text,
	`last_updated` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX `idx_school_zones_dbn` ON `school_zones` (`dbn`);--> statement-breakpoint
CREATE INDEX `idx_school_zones_grade` ON `school_zones` (`grade_level`);--> statement-breakpoint
CREATE INDEX `idx_school_zones_district` ON `school_zones` (`district`);--> statement-breakpoint
CREATE TABLE `schools` (
	`dbn` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`district` integer NOT NULL,
	`address` text NOT NULL,
	`grade_band` text NOT NULL,
	`academics_score` integer,
	`climate_score` integer,
	`progress_score` integer,
	`ela_proficiency` integer,
	`math_proficiency` integer,
	`science_proficiency` integer,
	`ela_tested_count` integer,
	`ela_eligible_count` integer,
	`ela_participation_rate` integer,
	`math_tested_count` integer,
	`math_eligible_count` integer,
	`math_participation_rate` integer,
	`ela_grade3` integer,
	`ela_grade4` integer,
	`ela_grade5` integer,
	`ela_grade6` integer,
	`ela_grade7` integer,
	`ela_grade8` integer,
	`math_grade3` integer,
	`math_grade4` integer,
	`math_grade5` integer,
	`math_grade6` integer,
	`math_grade7` integer,
	`math_grade8` integer,
	`science_grade5` integer,
	`science_grade8` integer,
	`assessment_year` text,
	`assessment_source` text,
	`enrollment` integer,
	`student_teacher_ratio` real,
	`elementary_enrollment` integer,
	`middle_enrollment` integer,
	`high_school_enrollment` integer,
	`economic_need_index` integer,
	`attendance_rate` integer,
	`teacher_attendance_rate` integer,
	`quality_rating_instruction` text,
	`quality_rating_safety` text,
	`quality_rating_family` text,
	`ell_percent` integer,
	`iep_percent` integer,
	`asian_percent` integer,
	`black_percent` integer,
	`hispanic_percent` integer,
	`white_percent` integer,
	`multi_racial_percent` integer,
	`next_level_readiness` integer,
	`admission_method` text,
	`accountability_status` text,
	`principal_name` text,
	`principal_experience_years` real,
	`teacher_experience_percent` integer,
	`middle_schools_pipeline` text,
	`website` text,
	`phone` text,
	`student_safety` integer,
	`student_teacher_trust` integer,
	`student_engagement` integer,
	`teacher_quality` integer,
	`teacher_collaboration` integer,
	`teacher_leadership` integer,
	`guardian_satisfaction` integer,
	`guardian_communication` integer,
	`guardian_school_trust` integer,
	`latitude` real,
	`longitude` real,
	`zip_code` text,
	`has_3k` integer DEFAULT false,
	`has_prek` integer DEFAULT false,
	`has_2k` integer DEFAULT false,
	`borough` text,
	`early_childhood_source` text,
	`has_gifted_talented` integer DEFAULT false,
	`gt_program_type` text,
	`has_dual_language` integer DEFAULT false,
	`dual_language_languages` text,
	`has_transitional_bilingual` integer DEFAULT false,
	`pta_fundraising_total` integer,
	`pta_fundraising_year` text,
	`pta_per_student` integer,
	`graduation_rate_4yr` integer,
	`graduation_rate_6yr` integer,
	`college_readiness_rate` integer,
	`college_enrollment_rate` integer,
	`sat_avg_reading` integer,
	`sat_avg_math` integer,
	`sat_avg_total` integer,
	`regents_pass_rate` integer,
	`ap_course_count` integer,
	`ap_pass_rate` integer,
	`is_specialized_hs` integer DEFAULT false,
	`hs_admission_method` text,
	`last_updated` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE INDEX `schools_district_idx` ON `schools` (`district`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`sid` text PRIMARY KEY NOT NULL,
	`sess` text NOT NULL,
	`expire` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `IDX_session_expire` ON `sessions` (`expire`);--> statement-breakpoint
CREATE TABLE `tracked_schools` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`school_dbn` text NOT NULL,
	`status` text DEFAULT 'researching',
	`notes` text,
	`open_house_date` integer,
	`tour_date` integer,
	`application_deadline` integer,
	`notify_open_house` integer DEFAULT true,
	`notify_tour` integer DEFAULT true,
	`notify_deadline` integer DEFAULT true,
	`open_house_notified_at` integer,
	`tour_notified_at` integer,
	`deadline_notified_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`school_dbn`) REFERENCES `schools`(`dbn`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tracked_user_school_idx` ON `tracked_schools` (`user_id`,`school_dbn`);--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`user_id` text PRIMARY KEY NOT NULL,
	`home_address` text,
	`latitude` real,
	`longitude` real,
	`zoned_elementary_dbn` text,
	`zoned_middle_dbn` text,
	`zoned_high_dbn` text,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`first_name` text,
	`last_name` text,
	`profile_image_url` text,
	`home_address` text,
	`home_lat` real,
	`home_lng` real,
	`stripe_customer_id` text,
	`stripe_subscription_id` text,
	`subscription_status` text DEFAULT 'free',
	`subscription_plan` text DEFAULT 'free',
	`subscription_expires_at` integer,
	`free_view_school_dbn` text,
	`drip_emails_sent` text DEFAULT '[]',
	`email_unsubscribed` integer DEFAULT false,
	`last_drip_email_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000),
	`updated_at` integer DEFAULT (unixepoch() * 1000)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);