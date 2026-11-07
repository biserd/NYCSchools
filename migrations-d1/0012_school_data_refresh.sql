-- schools is at D1's column limit; keep reporting metadata in a companion table.
CREATE TABLE school_profile_metadata (
  dbn TEXT PRIMARY KEY REFERENCES schools(dbn), demographics_year TEXT,
  demographics_source TEXT, science_assessment_year TEXT
);
INSERT INTO school_profile_metadata(dbn,science_assessment_year)
  SELECT dbn,assessment_year FROM schools WHERE science_proficiency IS NOT NULL;
CREATE TABLE school_data_releases (
  id TEXT PRIMARY KEY, dataset TEXT NOT NULL, reporting_year TEXT NOT NULL,
  source_url TEXT NOT NULL, source_hash TEXT NOT NULL, imported_at TEXT NOT NULL,
  notes TEXT NOT NULL
);
CREATE TABLE school_demographics_history (
  dbn TEXT NOT NULL REFERENCES schools(dbn), school_year TEXT NOT NULL,
  data TEXT NOT NULL, source_url TEXT NOT NULL, source_hash TEXT,
  PRIMARY KEY(dbn,school_year)
);
