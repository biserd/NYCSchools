import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import type { PilotRead } from '../../server/classroomPilot';

export function openPilotSqlite() {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE schools (dbn TEXT PRIMARY KEY, name TEXT NOT NULL);');
  db.exec(readFileSync('migrations-d1/0016_classroom_data_pilot.sql','utf8'));
  db.exec(readFileSync('dist/classroom-pilot/classroom-pilot.sql','utf8'));
  const read: PilotRead = async <T extends Record<string,unknown>>(statement: string, params: string[]=[]) =>
    db.prepare(statement).all(...params) as T[];
  return {db,read};
}
