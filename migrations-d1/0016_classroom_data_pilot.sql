-- Versioned registers are intentionally separate from enrollment_data, which
-- mixes admissions and demographic reporting cohorts.
CREATE TABLE IF NOT EXISTS classroom_pilot_releases (
  id TEXT PRIMARY KEY,
  dataset TEXT NOT NULL CHECK(dataset IN ('register','class_size','cap')),
  school_year TEXT NOT NULL,
  observed_on TEXT,
  release_label TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK(revision > 0),
  status TEXT NOT NULL CHECK(status IN ('audited','preliminary','revised','forecast')),
  sources_json TEXT NOT NULL CHECK(json_valid(sources_json)),
  summary_json TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(summary_json)),
  UNIQUE(dataset, observed_on, revision)
);
CREATE TABLE IF NOT EXISTS classroom_pilot_register (
  release_id TEXT NOT NULL REFERENCES classroom_pilot_releases(id),
  dbn TEXT NOT NULL,
  grade TEXT NOT NULL,
  enrolled INTEGER CHECK(enrolled >= 0),
  value_status TEXT NOT NULL CHECK(value_status IN ('reported','missing','suppressed')),
  CHECK((value_status = 'reported') = (enrolled IS NOT NULL)),
  PRIMARY KEY(release_id, dbn, grade)
);
CREATE TABLE IF NOT EXISTS classroom_pilot_classes (
  release_id TEXT NOT NULL REFERENCES classroom_pilot_releases(id),
  dbn TEXT NOT NULL,
  school_name TEXT NOT NULL,
  grade TEXT NOT NULL,
  program TEXT NOT NULL CHECK(program IN ('Gen Ed','ICT')),
  students INTEGER NOT NULL CHECK(students > 0),
  classes INTEGER NOT NULL CHECK(classes > 0),
  PRIMARY KEY(release_id, dbn, grade, program)
);
CREATE TABLE IF NOT EXISTS classroom_pilot_caps (
  release_id TEXT NOT NULL REFERENCES classroom_pilot_releases(id),
  dbn TEXT NOT NULL,
  grade TEXT NOT NULL,
  eligible INTEGER NOT NULL CHECK(eligible > 0),
  meeting INTEGER NOT NULL CHECK(meeting BETWEEN 0 AND eligible),
  PRIMARY KEY(release_id, dbn, grade)
);
