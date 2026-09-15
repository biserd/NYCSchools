-- Additive only: never changes canonical schools, program flags or rating inputs.
CREATE TABLE IF NOT EXISTS school_survey_releases (
  id text PRIMARY KEY,
  year integer NOT NULL CHECK (year >= 2007),
  instrument text NOT NULL CHECK (instrument IN ('k12-family','k12-teacher','k12-student','b5-family','b5-teacher')),
  source_url text NOT NULL,
  source_hash text NOT NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, instrument)
);
CREATE TABLE IF NOT EXISTS school_survey_results (
  release_id text NOT NULL REFERENCES school_survey_releases(id),
  source_id text NOT NULL,
  source_name text NOT NULL,
  school_dbn varchar REFERENCES schools(dbn),
  center_id integer REFERENCES nyceec_centers(id),
  response_count integer CHECK (response_count >= 0),
  response_rate real CHECK (response_rate BETWEEN 0 AND 1),
  metrics jsonb NOT NULL,
  match_method text NOT NULL CHECK (match_method IN ('dbn','loc_code','loc_code_sems_code','unmatched')),
  PRIMARY KEY (release_id, source_id)
);
CREATE INDEX IF NOT EXISTS school_survey_results_school_idx ON school_survey_results(school_dbn);
CREATE INDEX IF NOT EXISTS school_survey_results_center_idx ON school_survey_results(center_id);
