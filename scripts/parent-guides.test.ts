import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { School, PrivateSchool, HsGraduation } from '../shared/schema';
import { PARENT_GUIDES, getParentGuide, parentGuidePath } from '../shared/parent-guides';
import { buildParentGuideData, includesKindergarten, hasPrivateElementary } from '../shared/parent-guide-data';
import { ParentGuideContent } from '../shared/ParentGuideContent';
import { LandingDecisionContent } from '../shared/LandingDecisionContent';
import { getSeoLanding, matchesSeoLanding } from '../shared/seo-landings';

const guide = (slug: string) => getParentGuide(slug)!;
const school = (overrides: Partial<School>) => ({ dbn: '02M006', name: 'Example <school>', district: 2, grade_band: 'K-5', has_2k: false, has_3k: false, has_prek: false, assessment_year: null, ...overrides } as School);
const privateSchool = (overrides: Partial<PrivateSchool>) => ({ ncesId: '123', name: 'Example private', lowestGrade: 'PK', highestGrade: '8', gradesOffered: 'PK-8', borough: 'Queens', ...overrides } as PrivateSchool);
for (const grade of ['K', 'K-5', 'PK-8', 'K–12', '3K-5']) assert.equal(includesKindergarten(grade), true, grade);
for (const grade of ['2K', '3K', 'PK', '6-8', '9-12', 'Unknown', 'PRE-K']) assert.equal(includesKindergarten(grade), false, grade);
assert.ok(hasPrivateElementary(privateSchool({})));
assert.ok(!hasPrivateElementary(privateSchool({ lowestGrade: 'PK', highestGrade: 'PK', gradesOffered: 'PK' })));
assert.ok(!hasPrivateElementary(privateSchool({ lowestGrade: '9', highestGrade: '12', gradesOffered: '9-12' })));
assert.ok(!hasPrivateElementary(privateSchool({ lowestGrade: null, highestGrade: null, gradesOffered: null })));

const overlap = school({ has_2k: true, has_3k: true, has_prek: true });
const continuity = buildParentGuideData(guide('2k-3k-prek-kindergarten-same-school'), [overlap, overlap, school({ dbn: '02M002', grade_band: '2K', has_2k: true })]);
assert.equal(continuity.rows.length, 1, 'canonical IDs counted once; one-program records excluded');
assert.match(continuity.summary[0], /1 list all four/);
assert.equal(continuity.rows[0].cells[5], 'Cycle not recorded');
assert.equal(continuity.bars[2].count, 1);
const privateData = buildParentGuideData(guide('private-elementary-schools-nyc'), [], [privateSchool({ enrollment: 0 }), privateSchool({ enrollment: 0 }), privateSchool({ ncesId: '456', lowestGrade: '9', highestGrade: '12' })]);
assert.equal(privateData.rows.length, 1);
assert.equal(privateData.rows[0].cells[2], '0');
assert.equal(privateData.rows[0].cells[3], 'Not recorded');
assert.equal(privateData.bars.reduce((n, b) => n + b.count, 0), 1);

const first = school({ assessment_year: '2024-25', ela_proficiency: 0, math_proficiency: null });
const second = school({ dbn: '02M290', name: 'Second school', assessment_year: '2024-25', ela_proficiency: 20, math_proficiency: 90 });
const paired = buildParentGuideData(guide('ps6-vs-ps290'), [first, second]);
assert.equal(paired.rows[0].cells[2], '0%');
assert.equal(paired.rows[0].cells[3], 'Not recorded');
assert.ok(paired.summary.some(s => s.includes('20 percentage points below')));
assert.ok(!paired.summary.some(s => s.includes('Math:')));
const unequal = buildParentGuideData(guide('ps6-vs-ps290'), [first, { ...second, assessment_year: '2023-24' }]);
assert.ok(unequal.summary.some(s => s.includes('no numerical proficiency gap')));
const absent = buildParentGuideData(guide('ps6-vs-ps290'), []);
assert.equal(absent.rows.length, 2);
assert.equal(absent.rows[0].href, '');
const high = buildParentGuideData(guide('townsend-harris-vs-stuyvesant'), []);
assert.ok(!high.headers.some(h => /ELA|Math/.test(h)));
const cohort = (dbn: string, cohort_year: number, grad_rate_4yr: number | null) => ({ dbn, cohort_year, grad_rate_4yr, total_cohort: 500, cohort_label: null, data_source: 'NYC DOE InfoHub' } as HsGraduation);
const graduationComparison = buildParentGuideData(guide('townsend-harris-vs-stuyvesant'), [school({ dbn: '25Q525' }), school({ dbn: '02M475' })], [], [cohort('25Q525', 2020, 99), cohort('25Q525', 2021, 100), cohort('02M475', 2020, 98), cohort('02M475', 2021, null)]);
assert.match(graduationComparison.summary[1], /shared 2020 entry cohort/);
assert.match(graduationComparison.summary[1], /1 percentage points/);
assert.equal(graduationComparison.rows[0].cells[2], '99%');
assert.match(graduationComparison.rows[1].cells[4], /2020 entry/);

const mandarin = getSeoLanding('program', 'mandarin-dual-language')!;
assert.ok(!matchesSeoLanding(school({ has_dual_language: true, dual_language_languages: ['Chinese'] }), mandarin));
assert.ok(matchesSeoLanding(school({ has_dual_language: true, dual_language_languages: ['Chinese (Mandarin)'] }), mandarin));
const screened = getSeoLanding('program', 'screened-high-schools')!;
assert.ok(!matchesSeoLanding(school({ hs_admission_method: 'Unscreened' }), screened));
assert.ok(matchesSeoLanding(school({ hs_admission_method: 'Screened With Assessment' }), screened));

const routes = new Set(PARENT_GUIDES.map(parentGuidePath));
assert.equal(routes.size, 5);
for (const page of PARENT_GUIDES) {
  assert.ok(page.sources.length >= 2 && page.questions.length >= 2);
  const html = renderToStaticMarkup(React.createElement(ParentGuideContent, { guide: page, data: buildParentGuideData(page, [first, second], [privateSchool({})]) }));
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /<table/);
  assert.match(html, /Sources and data limits/);
  assert.match(html, /Your next step/);
  assert.match(html, /2026-10-25/);
  for (const link of page.related) if (link.href.startsWith('/guides/')) assert.ok(routes.has(link.href), link.href);
  for (const anchor of html.matchAll(/<a\b[^>]*href="https?:[^>]*>/g)) {
    assert.match(anchor[0], /target="_blank"/);
    assert.match(anchor[0], /rel="nofollow noopener noreferrer"/);
  }
}
const safeHtml = renderToStaticMarkup(React.createElement(ParentGuideContent, { guide: guide('ps6-vs-ps290'), data: paired }));
assert.match(safeHtml, /Example &lt;school&gt;/);
assert.ok(!safeHtml.includes('Example <school>'));
const geo = renderToStaticMarkup(React.createElement(LandingDecisionContent, { landing: getSeoLanding('neighborhood', 'upper-east-side')!, schools: [first] }));
assert.match(geo, /ZIP-based/);
assert.match(geo, /Assessment year/);
assert.match(geo, /\/guides\/ps6-vs-ps290/);
for (const file of ['server/workerStatic.ts', 'server/index-prod.ts', 'server/agentMarkdown.ts']) assert.match(readFileSync(file, 'utf8'), /\|guides\)/);
assert.match(readFileSync('server/seoFeeds.ts', 'utf8'), /PARENT_GUIDES.map/);
assert.match(readFileSync('server/seoRenderer.ts', 'utf8'), /React.createElement\(ParentGuideContent/);
assert.match(readFileSync('client/src/App.tsx', 'utf8'), /lazy\(\(\) => import\("@\/pages\/parent-guide"\)\)/);
console.log('Parent-guide data, source, linking, accessibility markup and missing-data regressions passed.');

// Exercise the actual production SEO renderer, data loader and sitemap against
// isolated storage fixtures; no database requests or writes are made.
const { storage } = await import('../server/storage');
const { renderSeoHtml, clearSeoCache } = await import('../server/seoRenderer');
const { sitemapByName } = await import('../server/seoFeeds');
const { deleteCache } = await import('../server/cache');
const original = { getSchools: storage.getSchools, getSchool: storage.getSchool, getPrivateSchools: storage.getPrivateSchools, getHSGraduation: storage.getHSGraduation };
const template = '<html><head><title>Base</title><meta name="description" content="Base" /></head><body><div id="root"></div></body></html>';
const clear = () => { clearSeoCache(); for (const page of PARENT_GUIDES) deleteCache(`parent-guide:${page.slug}`); };
try {
  storage.getSchools = async () => [overlap, second];
  storage.getSchool = async dbn => [first, second, school({ dbn: '25Q525' }), school({ dbn: '02M475' })].find(s => s.dbn === dbn);
  storage.getPrivateSchools = async () => [privateSchool({})];
  storage.getHSGraduation = async dbn => [cohort(dbn, 2020, 99)];
  clear();
  const sitemap = await sitemapByName('guides');
  for (const page of PARENT_GUIDES) {
    const path = parentGuidePath(page);
    const html = await renderSeoHtml(path, template);
    assert.ok(html, path);
    assert.ok(html.includes(`https://nycschoolsratings.com${path}`));
    assert.match(html, /Sources and data limits/);
    assert.match(html, /Your next step/);
    assert.match(html, /BreadcrumbList/);
    assert.ok(sitemap?.includes(`<loc>https://nycschoolsratings.com${path}</loc>`));
    if (page.kind !== 'zones') assert.match(html, /What our school records show/);
  }
  assert.equal(await renderSeoHtml('/guides/unknown-page', template), null);
  const hub = await renderSeoHtml('/explore-schools', template);
  for (const page of PARENT_GUIDES) assert.ok(hub?.includes(parentGuidePath(page)));
  const neighborhood = await renderSeoHtml('/neighborhood/upper-east-side', template);
  assert.match(neighborhood!, /ZIP-based discovery area/);
  clear();
  storage.getSchools = async () => { throw new Error('Simulated temporary directory outage'); };
  const outage = await renderSeoHtml('/guides/2k-3k-prek-kindergarten-same-school', template);
  assert.match(outage!, /School data is temporarily unavailable/);
  storage.getSchools = async () => [overlap];
  // Deliberately do not clear caches: outage content must not have been cached.
  const recovered = await renderSeoHtml('/guides/2k-3k-prek-kindergarten-same-school', template);
  assert.match(recovered!, /1 list all four/);
  assert.ok(!recovered!.includes('School data is temporarily unavailable'));
} finally {
  Object.assign(storage, original);
  clear();
}
console.log('Production SSR, guide loader, sitemap, unknown URLs and outage recovery passed.');
