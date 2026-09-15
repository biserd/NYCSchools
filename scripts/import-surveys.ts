/** Explicit offline validation, then transactional DB import. Never updates schools. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import XLSX from 'xlsx';
import { metricLabel, parseSurveyNumber, type SurveyInstrument } from '../shared/surveys';

const input = process.argv[2];
if (!input) throw new Error('Usage: tsx scripts/import-surveys.ts SOURCE_DIRECTORY --export OUTPUT.json; then use import:surveys:d1 with the explicit staging database ID');
if (process.argv.includes('--apply')) throw new Error('Use import:surveys:d1 EXPORT.json --expected-database e48a9ae9-4948-4dae-863a-06f6b026b436 --apply. PostgreSQL writes are disabled on this migration branch.');
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
console.log('Source validation passed. No database changes. Use import:surveys:d1 to validate matching and import the JSON export into D1 staging.');
