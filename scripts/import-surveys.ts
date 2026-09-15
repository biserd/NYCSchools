/** Explicit offline validation, then transactional DB import. Never updates schools. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import XLSX from 'xlsx';
import { Client } from 'pg';
import { metricLabel, parseSurveyNumber, type SurveyInstrument } from '../shared/surveys';
import { matchSurveyIdentity } from '../shared/survey-matching';

const input = process.argv[2];
if (!input) throw new Error('Usage: tsx scripts/import-surveys.ts SOURCE_DIRECTORY [--apply --expected-host HOST]');
const files: [SurveyInstrument, string][] = [
  ['k12-family','guardian'], ['k12-teacher','teacher'], ['k12-student','student'],
  ['b5-family','b-5-guardian'], ['b5-teacher','b-5-teacher'],
];
const releases = [];
for (const [instrument, suffix] of files) {
  const filename = `2026-public-data-file-${suffix}.xlsx`;
  const bytes = await fs.readFile(path.join(input, filename));
  const workbook = XLSX.read(bytes, { type: 'buffer', sheets: instrument === 'k12-teacher' ? 'new total tab' : 'Total' });
  const sheetName = instrument === 'k12-teacher' ? 'new total tab' : 'Total';
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Missing ${sheetName}: ${filename}`);
  const cells = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
  const headers = cells[0].map(v => String(v ?? '').trim());
  if (headers[0] !== 'DBN') throw new Error(`Unexpected ID column: ${filename}`);
  const respondent = instrument.endsWith('family') ? 'family' : instrument.endsWith('student') ? 'student' : 'teacher';
  const countIndex = headers.findIndex(h => h.toLowerCase().includes(respondent) && /count/i.test(h));
  const rateIndex = headers.findIndex(h => h.toLowerCase().includes(respondent) && /rate/i.test(h));
  if (countIndex < 0) throw new Error(`Missing response count: ${filename}`);
  const metricColumns = headers.map((h,i) => ({h,i})).filter(({h,i}) => i >= 2 && h && !/count|rate/i.test(h));
  if (!metricColumns.length) throw new Error(`Missing metrics: ${filename}`);
  const seen = new Set<string>();
  const rows = cells.slice(1).filter(r => r[0] != null && String(r[0]).trim()).map(row => {
    const sourceId = String(row[0]).trim().toUpperCase();
    if (seen.has(sourceId)) throw new Error(`Duplicate ${sourceId}: ${filename}`);
    seen.add(sourceId);
    const count = parseSurveyNumber(row[countIndex], Number.MAX_SAFE_INTEGER);
    if (count !== null && !Number.isInteger(count)) throw new Error('Non-integer response count');
    return { sourceId, sourceName: String(row[1] ?? ''), responseCount: count,
      responseRate: rateIndex < 0 ? null : parseSurveyNumber(row[rateIndex], 1),
      metrics: metricColumns.map(({h,i}) => {
        const value = parseSurveyNumber(row[i],100);
        return { key: h, label: metricLabel(h), value, status: value === null ? 'not_reported' : 'reported' };
      }) };
  });
  releases.push({ id: `2026-${instrument}`, instrument, sourceUrl: `https://infohub.nyced.org/docs/default-source/default-document-library/${filename}`, hash: createHash('sha256').update(bytes).digest('hex'), rows });
}
console.log(JSON.stringify(releases.map(r => ({instrument:r.instrument, rows:r.rows.length, hash:r.hash})), null, 2));
if (process.argv.includes('--export')) {
  const output = process.argv[process.argv.indexOf('--export')+1];
  if (!output || output.startsWith('--')) throw new Error('--export requires a JSON path');
  await fs.writeFile(output, JSON.stringify(releases));
}
if (!process.argv.includes('--apply')) {
  console.log('Source validation passed. No database changes. Matching is validated against the destination during --apply.');
} else {
  const connectionString = process.env.DATABASE_URL;
  const expectedHost = process.argv[process.argv.indexOf('--expected-host') + 1];
  if (!connectionString || !process.argv.includes('--expected-host') || new URL(connectionString).hostname !== expectedHost) throw new Error('DATABASE_URL and matching --expected-host are required');
  const client = new Client({connectionString});
  await client.connect();
  try {
    await client.query('BEGIN');
    await client.query("SET LOCAL lock_timeout='5s'");
    await client.query(await fs.readFile('migrations/20260915_surveys.sql','utf8'));
    const schools = new Set((await client.query('SELECT dbn FROM schools')).rows.map(r => r.dbn));
    const centers = (await client.query('SELECT id,loc_code AS "locCode",sems_code AS "semsCode" FROM nyceec_centers')).rows;
    for (const release of releases) {
      const previous = await client.query('SELECT source_hash FROM school_survey_releases WHERE id=$1',[release.id]);
      if (previous.rowCount) {
        if (previous.rows[0].source_hash !== release.hash) throw new Error(`Source changed for ${release.id}; review revision before replacing`);
        console.log(`${release.id}: already imported; unchanged`); continue;
      }
      await client.query('INSERT INTO school_survey_releases(id,year,instrument,source_url,source_hash) VALUES($1,2026,$2,$3,$4)',[release.id,release.instrument,release.sourceUrl,release.hash]);
      let matched=0;
      for (const row of release.rows) {
        const identity=matchSurveyIdentity(row.sourceId,release.instrument,schools,centers);
        if (identity.schoolDbn || identity.centerId) matched++;
        await client.query('INSERT INTO school_survey_results(release_id,source_id,source_name,school_dbn,center_id,response_count,response_rate,metrics,match_method) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[release.id,row.sourceId,row.sourceName,identity.schoolDbn,identity.centerId,row.responseCount,row.responseRate,JSON.stringify(row.metrics),identity.method]);
      }
      console.log(`${release.id}: ${matched}/${release.rows.length} exact ID matches; unmatched retained without profile association`);
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { await client.end(); }
}
