import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { PrivateSchool } from '../shared/schema';
import { getParentGuide } from '../shared/parent-guides';
import { buildParentGuideData, privateSchoolServesStage } from '../shared/parent-guide-data';
import { privateDirectoryPath, MAP_META, PRIVATE_DIRECTORY_META } from '../shared/discovery-pages';
import { RankingReportContent } from '../shared/RankingReportContent';
import { PrivateDirectoryContent } from '../shared/PrivateDirectoryContent';
import { storage } from '../server/storage';
import { renderSeoHtml, clearSeoCache } from '../server/seoRenderer';
import { sitemapByName } from '../server/seoFeeds';
import { guideActionParams } from '../client/src/lib/guide-actions';

const privateSchool = (values: Partial<PrivateSchool>) => ({ ncesId:'a', name:'A school', borough:'Brooklyn', lowestGrade:'K', highestGrade:'5', gradesOffered:'K-5', ...values } as PrivateSchool);
const records = [privateSchool({}), privateSchool({}), privateSchool({ ncesId:'b', lowestGrade:'6', highestGrade:'12' }), privateSchool({ ncesId:'c', borough:'Queens' }), privateSchool({ ncesId:'d', lowestGrade:null, highestGrade:null, gradesOffered:null })];
const brooklyn = buildParentGuideData(getParentGuide('private-schools-brooklyn')!, [], records);
assert.deepEqual(brooklyn.rows.map(r=>r.id), ['a','b','d'], 'Brooklyn scope excludes other boroughs and deduplicates only canonical IDs');
assert.deepEqual(brooklyn.bars.map(b=>b.count), [1,1,1], 'overlapping stage counts remain separate');
assert.ok(!brooklyn.rows.find(r=>r.id==='d')?.tags?.some(t=>t.startsWith('stage:')), 'unknown grade spans remain unclassified');
assert.equal(privateSchoolServesStage(privateSchool({lowestGrade:'PK',highestGrade:'PK',gradesOffered:'PK'}),'elementary'), false, 'preschool alone is not elementary');
assert.equal(privateSchoolServesStage(privateSchool({lowestGrade:'KG',highestGrade:'8'}),'middle'), true);
assert.equal(privateSchoolServesStage(privateSchool({lowestGrade:'12',highestGrade:'6'}),'middle'), false);
assert.equal(privateDirectoryPath('Brooklyn','elementary'), '/private-schools?borough=Brooklyn&grade=elementary#school-results');
assert.equal(privateDirectoryPath('unknown','unknown'), '/private-schools#school-results');
const origin = 'https://nycschoolsratings.com';
assert.deepEqual(guideActionParams('/blog/best-nyc-middle-schools-2026?query=example','/family?child=example#calendar',origin,'intro'), {guide_path:'/blog/best-nyc-middle-schools-2026',destination_path:'/family',action:'reminders',placement:'intro'}, 'event slices use pathnames, not queries or fragments');
assert.equal(guideActionParams('/blog/example','https://www.schools.nyc.gov/compare',origin,'intro'), null, 'external official links are not product actions');
assert.equal(guideActionParams('/blog/example','/pricing',origin,'intro'), null, 'purchase tracking remains outside this change');
assert.equal(guideActionParams('/blog/example','/compare',origin,'unexpected')?.placement,'content');
const navigation = renderToStaticMarkup(React.createElement(PrivateDirectoryContent));
assert.match(navigation, /borough=Brooklyn/);
assert.match(navigation, /grade=middle/);
assert.match(navigation, /private-schools-brooklyn/);

const middle = renderToStaticMarkup(React.createElement(RankingReportContent,{stage:'middle'}));
for (const placement of ['intro','shortlist']) for (const action of ['shortlist','compare','reminders']) assert.ok(middle.includes(`data-guide-action="${action}" data-guide-placement="${placement}"`));
assert.ok(!renderToStaticMarkup(React.createElement(RankingReportContent,{stage:'elementary'})).includes('data-guide-action="reminders"'));

const template = '<html><head><title>Base</title></head><body><div id="root"></div></body></html>';
const original = {getPrivateSchools:storage.getPrivateSchools};
try {
  storage.getPrivateSchools = async()=>records;
  clearSeoCache();
  for (const [path,meta] of [['/map',MAP_META],['/private-schools',PRIVATE_DIRECTORY_META]] as const) {
    const html = await renderSeoHtml(path,template);
    assert.ok(html?.includes(`<title>${meta.title.replaceAll('&','&amp;')}</title>`));
    assert.ok(html?.includes(`rel="canonical" href="https://nycschoolsratings.com${path}"`));
    assert.ok(html?.includes('content="index, follow"'));
    assert.equal((html?.match(/<h1\b/g)||[]).length,1);
  }
  const mapGuide = await renderSeoHtml('/guides/nyc-school-district-map-and-zones',template);
  assert.ok(mapGuide?.includes('rel="canonical" href="https://nycschoolsratings.com/guides/nyc-school-district-map-and-zones"'));
  const guide = await renderSeoHtml('/guides/private-schools-brooklyn',template);
  assert.ok(guide?.includes('/private-school/'));
  assert.ok(guide?.includes('https://www.packer.edu/admissions/welcome'));
  assert.ok(guide?.includes('2026-11-07'));
  assert.ok(!guide?.includes('Bank Street'), 'Brooklyn guide does not inherit Manhattan tuition examples');
  const sitemap = await sitemapByName('guides');
  assert.ok(sitemap?.includes('<loc>https://nycschoolsratings.com/guides/private-schools-brooklyn</loc>\n    <lastmod>2026-11-07</lastmod>'));
} finally { Object.assign(storage,original); clearSeoCache(); }
console.log('Marketing discovery: scoped school records, grade filters, deep links, CTA markup, SSR canonicals and sitemap passed.');
