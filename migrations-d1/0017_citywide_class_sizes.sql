-- Additional public NYCPS snapshots. Do not update the pilot or rating inputs.
CREATE TABLE IF NOT EXISTS city_class_size_releases (
  id TEXT PRIMARY KEY, observed_on TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision > 0),
  release_label TEXT NOT NULL, sources_json TEXT NOT NULL CHECK(json_valid(sources_json)),
  UNIQUE(observed_on,revision)
);
CREATE TABLE IF NOT EXISTS city_class_size_sections (
  release_id TEXT NOT NULL REFERENCES city_class_size_releases(id),
  scope TEXT NOT NULL CHECK(scope IN ('school','district')), scope_id TEXT NOT NULL,
  band TEXT NOT NULL CHECK(band IN ('K5','MS','HS')), group_name TEXT NOT NULL,
  department TEXT NOT NULL, program TEXT NOT NULL,
  students INTEGER NOT NULL CHECK(students > 0), classes INTEGER NOT NULL CHECK(classes > 0),
  minimum TEXT, maximum TEXT,
  benchmark_verified INTEGER NOT NULL CHECK(benchmark_verified IN (0,1) AND (scope='district' OR benchmark_verified=0)),
  PRIMARY KEY(scope,scope_id,release_id,band,group_name,department,program)
) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS city_class_size_caps (
  release_id TEXT NOT NULL REFERENCES city_class_size_releases(id), dbn TEXT NOT NULL,
  scope TEXT NOT NULL CHECK(scope IN ('grade','course')), group_name TEXT NOT NULL,
  eligible INTEGER NOT NULL CHECK(eligible > 0), meeting INTEGER NOT NULL CHECK(meeting BETWEEN 0 AND eligible),
  PRIMARY KEY(dbn,release_id,scope,group_name)
) WITHOUT ROWID;
