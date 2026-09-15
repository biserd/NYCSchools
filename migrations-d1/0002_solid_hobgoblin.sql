CREATE TABLE `school_safety_recompute_rows` (
	`run_id` text NOT NULL,
	`school_type` text NOT NULL,
	`school_key` text NOT NULL,
	`radius_meters` integer NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`run_id`, `school_type`, `school_key`, `radius_meters`)
);
