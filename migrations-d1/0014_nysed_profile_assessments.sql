-- Supplemental profile evidence only. No changes to schools, historical
-- proficiency, Regents, or the ranking inputs.
CREATE TABLE IF NOT EXISTS school_assessment_archive_releases (
  id TEXT PRIMARY KEY NOT NULL,
  source_url TEXT NOT NULL,
  released_on TEXT NOT NULL,
  archive_sha256 TEXT NOT NULL UNIQUE CHECK(length(archive_sha256) = 64),
  dictionary_sha256 TEXT NOT NULL CHECK(length(dictionary_sha256) = 64)
);

CREATE TABLE IF NOT EXISTS school_assessment_archive_results (
  release_id TEXT NOT NULL REFERENCES school_assessment_archive_releases(id),
  dbn TEXT NOT NULL REFERENCES schools(dbn),
  spring_year INTEGER NOT NULL CHECK(spring_year >= 2025),
  subject TEXT NOT NULL CHECK(subject IN ('science','ela','math')),
  assessment TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK(grade BETWEEN 0 AND 8),
  population TEXT NOT NULL CHECK(population = 'All Students'),
  definition TEXT NOT NULL,
  institution_id TEXT NOT NULL CHECK(length(institution_id) = 12),
  beds_code TEXT NOT NULL CHECK(length(beds_code) = 12),
  directory_sha256 TEXT NOT NULL CHECK(length(directory_sha256) = 64),
  eligible INTEGER CHECK(eligible >= 0),
  tested INTEGER CHECK(tested >= 0 AND (eligible IS NULL OR tested <= eligible)),
  proficient INTEGER CHECK(proficient IS NULL OR (tested IS NOT NULL AND tested > 0 AND proficient BETWEEN 0 AND tested)),
  published_percent REAL CHECK(published_percent BETWEEN 0 AND 100),
  result_status TEXT NOT NULL CHECK(result_status IN ('count','published_percent','suppressed','zero_tested','missing')),
  CHECK(CASE result_status
    WHEN 'count' THEN tested IS NOT NULL AND tested > 0 AND proficient IS NOT NULL
    WHEN 'published_percent' THEN proficient IS NULL AND published_percent IS NOT NULL AND tested IS NOT NULL AND tested > 0
    WHEN 'suppressed' THEN proficient IS NULL AND published_percent IS NULL AND (tested IS NULL OR tested > 0)
    WHEN 'zero_tested' THEN tested IS NOT NULL AND tested = 0 AND proficient IS NULL AND published_percent IS NULL
    ELSE proficient IS NULL AND published_percent IS NULL AND (tested IS NULL OR tested > 0)
  END),
  PRIMARY KEY(release_id,dbn,spring_year,assessment,population)
);
CREATE INDEX IF NOT EXISTS school_assessment_archive_school_idx
  ON school_assessment_archive_results(dbn,subject,grade,spring_year);
