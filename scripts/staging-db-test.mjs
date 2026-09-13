import { Client } from 'pg';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
export async function runStagingTests(connectionString) {
  assert.equal(new URL(connectionString).hostname,'ep-lingering-sound-ay0yfu7q.c-5.us-east-2.aws.neon.tech');
  const db=new Client({connectionString,connectionTimeoutMillis:15000});await db.connect();
  const result={at:new Date().toISOString(),tests:[]};
  const digest=async()=> (await db.query(`SELECT count(*)::int AS count,md5(string_agg(row_to_json(s)::text, '' ORDER BY dbn)) AS hash FROM schools s`)).rows[0];
  try {
    await db.query("SET statement_timeout='60s'; SET lock_timeout='5s'");
    result.before=await digest();
    await db.query(await readFile('migrations/20260913_canonical_2k.sql','utf8'));
    await db.query(await readFile('migrations/20260913_canonical_2k.sql','utf8'));
    result.tests.push('Schema migration applies and reruns successfully');
    const baseline=await digest();
    const proposed=await readFile('reports/twok/proposed.sql','utf8');
    let rejected=false;try{await db.query(proposed)}catch(e){rejected=/Confirm the MySchools cycle/.test(e.message);await db.query('ROLLBACK')}
    assert(rejected);result.tests.push('Unacknowledged source cycle is rejected');
    await db.query("SET app.twok_expected_cycle='2025-26 School Year'");
    const responses=await db.query(proposed);
    result.dryRun={inserted:responses.filter(r=>r.command==='INSERT').reduce((n,r)=>n+r.rowCount,0),updated:responses.filter(r=>r.command==='UPDATE').reduce((n,r)=>n+r.rowCount,0)};
    assert.deepEqual(await digest(),baseline);result.tests.push('Backfill ROLLBACK restores complete schools fingerprint');
    assert.deepEqual(result.dryRun,{inserted:26,updated:589});
    const beforeRows=(await db.query('SELECT * FROM schools ORDER BY dbn')).rows;
    const oldIds=beforeRows.map(r=>r.dbn);
    const k12Before=beforeRows.filter(r=>r.grade_band!=='2K');
    const commitSql=proposed.replace(/ROLLBACK;\s*$/, 'COMMIT;');
    await db.query(commitSql);
    const afterRows=(await db.query('SELECT * FROM schools ORDER BY dbn')).rows;
    assert.deepEqual(afterRows.filter(r=>oldIds.includes(r.dbn)&&r.grade_band!=='2K'),k12Before);
    assert.deepEqual(afterRows.filter(r=>oldIds.includes(r.dbn)).map(r=>[r.dbn,r.name,r.grade_band]),beforeRows.map(r=>[r.dbn,r.name,r.grade_band]));
    assert.equal(afterRows.filter(r=>r.has_2k).length,615);
    const overlap=afterRows.find(r=>r.dbn==='10XAPN');
    assert(overlap.has_2k&&overlap.has_3k&&overlap.has_prek);
    assert.equal(afterRows.find(r=>r.dbn==='06G009').early_childhood_source.status,'needs_verification');
    assert.equal(afterRows.find(r=>r.dbn==='06G262').enrollment,null);
    assert(afterRows.find(r=>r.dbn==='06G262').early_childhood_source.registrationInstructions.includes('639 Edgecombe'));
    const applied=await digest();
    const replay=await db.query(commitSql);
    assert.equal(replay.filter(r=>['UPDATE','INSERT'].includes(r.command)).reduce((n,r)=>n+r.rowCount,0),0);
    assert.deepEqual(await digest(),applied);
    result.tests.push('Committed backfill: 26 inserts, 589 updates, 615 flagged providers','All existing IDs, names, grades and K–12 rows unchanged','Multi-program flags, verification status and missing measurements correct','Replaying backfill changes zero rows');
    const rollbackSql=(await readFile('reports/twok/rollback.sql','utf8')).replace(/ROLLBACK;\s*$/, 'COMMIT;');
    await db.query(rollbackSql);
    const restored=(await db.query('SELECT * FROM schools WHERE dbn=ANY($1) ORDER BY dbn',[oldIds])).rows;
    assert.deepEqual(restored,beforeRows);
    assert.equal((await digest()).count,baseline.count+26);
    result.tests.push('Conservative rollback restores every original school row; retains 26 new IDs');
    await db.query(commitSql);
    assert.deepEqual(await digest(),applied);
    result.tests.push('Reapplication after rollback restores the identical applied fingerprint');
    result.final=await digest();
    result.sample=(await db.query("SELECT dbn,latitude,longitude,has_2k,has_3k,has_prek,academics_score,enrollment FROM schools WHERE dbn='10XAPN'")).rows[0];
    return result;
  }finally{await db.query('ROLLBACK').catch(()=>{});await db.end();}
}
