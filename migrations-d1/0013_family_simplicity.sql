-- Additive only. Existing accounts, event IDs, reminder history and billing stay intact.
ALTER TABLE tuck_events ADD COLUMN end_date text;
ALTER TABLE tuck_events ADD COLUMN event_time text;
ALTER TABLE tuck_events ADD COLUMN timezone text NOT NULL DEFAULT 'America/New_York';
ALTER TABLE tuck_events ADD COLUMN source_id text;
CREATE UNIQUE INDEX tuck_events_source_key ON tuck_events(household_id,source_id);
CREATE TABLE family_activity (
 id text PRIMARY KEY NOT NULL,
 user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 event_type text NOT NULL,
 channel text NOT NULL,
 occurred_at integer NOT NULL,
 dedupe_key text NOT NULL UNIQUE
);
CREATE INDEX family_activity_date_idx ON family_activity(occurred_at,event_type);
