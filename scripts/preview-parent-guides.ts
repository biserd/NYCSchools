/** Read-only preview against public production directory records.
 * Serves the real built client plus shared server-rendered guide content.
 * No cookies/credentials are forwarded and no production writes are possible.
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { School, PrivateSchool, HsGraduation } from '../shared/schema';
import { PARENT_GUIDES, parentGuidePath } from '../shared/parent-guides';
import { buildParentGuideData } from '../shared/parent-guide-data';
import { ParentGuideContent } from '../shared/ParentGuideContent';
import { buildRankingReport } from '../shared/ranking-report';
import { RankingReportContent } from '../shared/RankingReportContent';

const base = 'https://nycschoolsratings.com';
async function getPublic<T>(path: string): Promise<T> {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error(`${path}: expected public record array`);
  return data as T;
}
const [schools, privateSchools] = await Promise.all([getPublic<School[]>('/api/schools'), getPublic<PrivateSchool[]>('/api/private-schools')]);
const graduation = (await Promise.all(['25Q525', '02M475'].map(dbn => getPublic<HsGraduation[]>(`/api/schools/${dbn}/graduation`)))).flat();
const models = new Map(PARENT_GUIDES.map(guide => [guide.slug, buildParentGuideData(guide, schools, privateSchools, graduation)]));
const reports = new Map(['elementary','middle'].map(stage=>[stage,{report:buildRankingReport(schools,stage as 'elementary'|'middle'),surveys:{}}]));
const comparisonIds = [...new Set(PARENT_GUIDES.flatMap(g=>g.dbns||[]))];
const surveyRows = Object.fromEntries(await Promise.all(comparisonIds.map(async dbn=>[dbn,await getPublic(`/api/surveys/school/${dbn}`).catch(()=>[])])));
for(const guide of PARENT_GUIDES) if(guide.kind==='comparison') models.get(guide.slug)!.surveys = surveyRows as any;
console.log(JSON.stringify({ source: 'Live public APIs, read-only', publicRecords: schools.length, privateRecords: privateSchools.length, guides: [...models.entries()].map(([slug, data]) => ({ slug, rows: data.rows.length, bytes: JSON.stringify(data).length, analysis: data.summary, missingProfiles: data.rows.filter(r => !r.href).map(r => r.id) })) }, null, 2));
const root = resolve('dist/public');
const index = readFileSync(resolve(root, 'index.html'), 'utf8');
const mime: Record<string, string> = { '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const json = (data: unknown) => JSON.stringify(data);
const preview = createServer(async (req, res) => {
  const path = new URL(req.url || '/', 'http://localhost').pathname;
  if (req.method !== 'GET') { res.writeHead(204); res.end(); return; }
  if (path.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
    const slug = path.replace('/api/parent-guides/', '');
    if(path.startsWith('/api/ranking-reports/')) return res.end(json(reports.get(path.split('/').at(-1)!)));
    if (models.has(slug)) return res.end(json(models.get(slug)));
    if (path === '/api/schools') return res.end(json(schools));
    if (path === '/api/private-schools') return res.end(json(privateSchools));
    // Profile links remain usable, but only explicitly public GET endpoints
    // are forwarded. No auth, calendar, billing or arbitrary API proxy exists.
    if (/^\/api\/schools\/[0-9]{2}[a-z][0-9]{3}(?:\/(?:history|admissions|graduation|regents|attendance|discipline|admissions-programs|zone))?$/i.test(path) || /^\/api\/private-schools\/[a-z0-9]+$/i.test(path)) {
      try {
        const response = await fetch(base + path, { signal: AbortSignal.timeout(20_000) });
        res.writeHead(response.status);
        return res.end(await response.text());
      } catch { res.writeHead(503); return res.end(json({ message: 'Public profile temporarily unavailable' })); }
    }
    if (path === '/api/subscription-status') return res.end(json({ isSubscribed: false }));
    res.writeHead(path === '/api/auth/user' ? 401 : 404); return res.end(json({ message: 'Read-only preview: endpoint not available' }));
  }
  if (path.startsWith('/assets/')) {
    const file = resolve(root, '.' + path);
    if (!file.startsWith(root + sep) || !existsSync(file)) { res.writeHead(404); return res.end(); }
    res.setHeader('Content-Type', mime[extname(file)] || 'application/octet-stream');
    return res.end(readFileSync(file));
  }
  const guide = PARENT_GUIDES.find(g => parentGuidePath(g) === path);
  let html = index;
  const rankingStage = path === '/blog/best-nyc-elementary-schools-2026' ? 'elementary' : path === '/blog/best-nyc-middle-schools-2026' ? 'middle' : null;
  if(rankingStage) html=html.replace(/<div id="root">[\s\S]*?<\/div>/,`<div id="root"><main><h1>NYC ${rankingStage} school comparison</h1>${renderToStaticMarkup(React.createElement(RankingReportContent,{stage:rankingStage,report:reports.get(rankingStage)!.report}))}</main></div>`);
  if (guide) {
    const content = renderToStaticMarkup(React.createElement(ParentGuideContent, { guide, data: models.get(guide.slug) }));
    html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${guide.title}</title>`)
      .replace(/<div id="root">[\s\S]*?<\/div>/, `<div id="root"><main class="container mx-auto px-4 py-8">${content}</main></div>`);
  }
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('X-Robots-Tag', 'noindex');
  res.end(html);
});
const port = Number(process.env.GUIDE_PREVIEW_PORT || 8797);
preview.listen(port, '127.0.0.1', () => console.log(`Read-only local preview: http://127.0.0.1:${port}/guides/private-elementary-schools-nyc`));
