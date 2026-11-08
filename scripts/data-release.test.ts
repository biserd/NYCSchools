import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {parse} from 'csv-parse/sync';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {DATA_RELEASE,DATA_RELEASE_RESOURCES,dataReleaseResourcePath,dataReleaseSchema} from '../shared/data-release';
import {DataReleaseContent} from '../shared/DataReleaseContent';
import {RELEASE_CHARTS,releaseSubjectSamples,releaseSchoolExamples} from '../shared/data-release-charts';
import {pressReleaseText} from '../shared/data-release-copy';
import {dataReleaseActionParams} from '../client/src/lib/data-release-actions';
import {renderSeoHtml,clearSeoCache} from '../server/seoRenderer';
import {sitemapByName} from '../server/seoFeeds';
import {blogPosts} from '../shared/blog-data';
const root='client/public'+DATA_RELEASE.resourceRoot;
const evidence=JSON.parse(readFileSync('client/public/data/score-movers-2026.json','utf8'));
const manifest=JSON.parse(readFileSync(root+'/manifest.json','utf8'));
for(const [name,item] of Object.entries(manifest.files) as [string,any][]) {
  const bytes=readFileSync(root+'/'+name);
  assert.equal(createHash('sha256').update(bytes).digest('hex'),item.sha256,name);
  assert.equal(bytes.length,item.bytes);
}
for(const resource of DATA_RELEASE_RESOURCES)assert.ok(readFileSync('client/public'+dataReleaseResourcePath(resource.file)).length>0);
assert.equal(readFileSync(root+'/press-release.txt','utf8'),pressReleaseText());
const assessment=parse(readFileSync(root+'/ela-math-school-changes-2025-2026.csv'),{columns:true,bom:true}) as any[];
assert.equal(assessment.length,1604);
for(const key of ['ela','math']) {
  const selected=assessment.filter(r=>r.subject===(key==='ela'?'ELA':'Math'));
  assert.equal(selected.length,evidence.assessments[key].length);
  const byDbn=new Map(selected.map(r=>[r.dbn,r]));
  for(const original of evidence.assessments[key]) {
    const row=byDbn.get(original.dbn)!;
    assert.equal(Number(row.previous_proficiency_pct),original.previous);
    assert.equal(Number(row.current_proficiency_pct),original.current);
    assert.equal(Number(row.change_pp_rounded_1dp),original.change);
    assert.equal(Number(row.previous_tested),original.previousTested);
    assert.equal(Number(row.current_tested),original.currentTested);
    assert.equal(row.previous_test_year,'2025');assert.equal(row.current_test_year,'2026');
    assert.equal(row.previous_school_year,'2024-25');assert.equal(row.current_school_year,'2025-26');
  }
}
const pairs=parse(readFileSync(root+'/regents-history-changes-2025-2026.csv'),{columns:true,bom:true}) as any[];
assert.equal(pairs.length,605);
for(const row of pairs) {
  const key=row.source_exam_label==='Global History and Geography'?'global-history':'us-history';
  assert.ok(['Global History and Geography','US History and Government'].includes(row.source_exam_label));
  const original=evidence.regents[key].pairs.find((r:any)=>r.dbn===row.dbn)!;
  assert.ok(original);
  assert.equal(Number(row.previous_pass_rate_65plus_pct),original.previous);
  assert.equal(Number(row.current_pass_rate_65plus_pct),original.current);
  assert.equal(Number(row.change_pp_rounded_1dp),original.change);
}
const snapshots=parse(readFileSync(root+'/regents-source-category-snapshots-2026.csv'),{columns:true,bom:true}) as any[];
assert.equal(snapshots.length,1594);
for(const row of snapshots) {
  assert.equal(row.reporting_year,'2026');
  if(['Common Core English','Integrated Algebra'].includes(row.source_exam_label))assert.match(row.growth_comparison_status,/withheld/);
}
const html=renderToStaticMarkup(React.createElement(DataReleaseContent));
assert.equal((html.match(/<h1/g)||[]).length,1);
assert.ok(html.includes('1,604')&&html.includes('605'));
assert.ok(html.includes('not a new government data release'));
assert.ok(html.includes('separate filtered samples'));
assert.ok(html.includes('href="/register"'));
assert.ok(html.includes('hello@nycschoolsratings.com'));
assert.equal((html.match(/data-release-chart=/g)||[]).length,3);
assert.equal(html.includes('\u2014'),false,'Release copy and visual captions contain no em dashes');
assert.ok(html.includes('Spring 2025 to spring 2026')&&html.includes('Reporting years 2025 to 2026'));
assert.ok(html.includes('Tested 2025')&&html.includes('Tested 2026'));
for(const [i,sample] of releaseSubjectSamples.entries()) {
  const source=sample.label==='ELA'?evidence.assessments.ela:sample.label==='Math'?evidence.assessments.math:
    evidence.regents[sample.label==='US History Regents'?'us-history':'global-history'].pairs;
  const changes=source.map((r:any)=>r.change).sort((a:number,b:number)=>a-b);
  const middle=Math.floor(changes.length/2);
  const median=changes.length%2?changes[middle]:(changes[middle-1]+changes[middle])/2;
  const plotted=RELEASE_CHARTS.directions.rows[i];
  assert.equal(plotted.Declined,source.filter((r:any)=>r.change<0).length);
  assert.equal(plotted.Improved,source.filter((r:any)=>r.change>0).length);
  assert.equal(plotted.Unchanged,source.filter((r:any)=>r.change===0).length);
  assert.equal(plotted.Declined+plotted.Improved+plotted.Unchanged,source.length);
  assert.equal(RELEASE_CHARTS.medians.rows[i].Change,median);
}
for(const [i,{subject,row}] of releaseSchoolExamples.entries()) {
  const source=subject.startsWith('ELA')?assessment.find(r=>r.dbn===row.dbn&&r.subject==='ELA'):
    subject.startsWith('Math')?assessment.find(r=>r.dbn===row.dbn&&r.subject==='Math'):
    pairs.find(r=>r.dbn===row.dbn&&r.source_exam_label==='US History and Government');
  assert.ok(source);
  const regents=subject.startsWith('US History');
  assert.equal(RELEASE_CHARTS.examples.rows[i]['2025'],Number(source[regents?'previous_pass_rate_65plus_pct':'previous_proficiency_pct']));
  assert.equal(RELEASE_CHARTS.examples.rows[i]['2026'],Number(source[regents?'current_pass_rate_65plus_pct':'current_proficiency_pct']));
  assert.equal(row.previousTested,Number(source.previous_tested));
  assert.equal(row.currentTested,Number(source.current_tested));
}
assert.deepEqual(RELEASE_CHARTS.examples.spec.xDomain,[0,100]);
assert.ok(RELEASE_CHARTS.medians.spec.xDomain[0]<0&&RELEASE_CHARTS.medians.spec.xDomain[1]>0);
const base='<html><head><title>Base</title><meta property="og:type" content="website"/></head><body><div id="root"></div></body></html>';
const ssr=await renderSeoHtml(DATA_RELEASE.path,base);
assert.ok(ssr?.includes('NewsArticle')&&ssr.includes('content="article"'));
assert.ok(ssr?.includes('data-release-article'));
assert.ok((await renderSeoHtml('/',base))?.includes(DATA_RELEASE.path));
assert.ok((await sitemapByName('blog'))?.includes(DATA_RELEASE.path));
assert.equal(blogPosts.filter(p=>p.slug===DATA_RELEASE.slug).length,1);
assert.equal(dataReleaseSchema()[0]['@type'],'NewsArticle');
const origin='https://nycschoolsratings.com';
const click=dataReleaseActionParams(DATA_RELEASE.path+'?email=not-recorded',origin+DATA_RELEASE.resourceRoot+'/README.txt?token=not-recorded',origin,'download','methodology','media_resources');
assert.ok(click);assert.equal(click.page_path,DATA_RELEASE.path);assert.equal(click.destination_path,DATA_RELEASE.resourceRoot+'/README.txt');
assert.ok(!JSON.stringify(click).includes('email=')&&!JSON.stringify(click).includes('token='));
assert.equal(dataReleaseActionParams('/', 'https://example.com/file',origin,'download','media_kit','homepage'),null);
assert.equal(dataReleaseActionParams('/',origin+'/file',origin,'download','unrecognized','homepage'),null);
assert.equal(dataReleaseActionParams('/',origin+DATA_RELEASE.path,origin,'unrecognized'),null);
clearSeoCache();
console.log('Data release: all CSV values/years reconcile, checksums and resources pass, public NewsArticle SSR/discovery works, and click attribution excludes query parameters.');
