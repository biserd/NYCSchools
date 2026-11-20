-- Official NYSED geographic-district aggregates for profile comparisons only.
CREATE TABLE IF NOT EXISTS school_assessment_archive_district_science (
  release_id TEXT NOT NULL REFERENCES school_assessment_archive_releases(id),
  district INTEGER NOT NULL CHECK(district BETWEEN 1 AND 32),
  spring_year INTEGER NOT NULL CHECK(spring_year >= 2025),
  assessment TEXT NOT NULL CHECK(assessment IN ('Science5','Science8')),
  population TEXT NOT NULL CHECK(population = 'All Students'),
  definition TEXT NOT NULL,
  institution_id TEXT NOT NULL CHECK(length(institution_id) = 12),
  beds_code TEXT NOT NULL CHECK(length(beds_code) = 12 AND substr(beds_code,5) = '00010000'
    AND CAST(substr(beds_code,3,2) AS INTEGER) = district),
  eligible INTEGER CHECK(eligible >= 0),
  tested INTEGER NOT NULL CHECK(tested > 0 AND (eligible IS NULL OR tested <= eligible)),
  proficient INTEGER NOT NULL CHECK(proficient BETWEEN 0 AND tested),
  PRIMARY KEY(release_id,district,spring_year,assessment,population)
);
