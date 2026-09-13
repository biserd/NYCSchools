-- Review and run explicitly before deploying application changes. No data deletion.
BEGIN;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS borough varchar;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS early_childhood_source jsonb;
ALTER TABLE schools ALTER COLUMN academics_score DROP NOT NULL;
ALTER TABLE schools ALTER COLUMN climate_score DROP NOT NULL;
ALTER TABLE schools ALTER COLUMN progress_score DROP NOT NULL;
ALTER TABLE schools ALTER COLUMN enrollment DROP NOT NULL;
ALTER TABLE schools ALTER COLUMN student_teacher_ratio DROP NOT NULL;
CREATE INDEX IF NOT EXISTS schools_has_2k_idx ON schools (dbn) WHERE has_2k = true;
-- Legacy tables retained as archives; no live imports or reads use twok_centers.
COMMIT;
