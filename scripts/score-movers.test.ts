import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {scoreMoverData as data} from '../shared/generated/score-movers-2026';
import {SCORE_ARTICLES,scoreArticleSchema} from '../shared/score-articles';
import {ScoreArticleContent} from '../shared/ScoreArticleContent';
import {ScoreMoversTeaser} from '../shared/ScoreMoversTeaser';
import {blogPosts} from '../shared/blog-data';
import {sitemapByName} from '../server/seoFeeds';
import {getSchoolSlug} from '../shared/school-utils';
import {renderSeoHtml,clearSeoCache,getCanonicalRedirectPath} from '../server/seoRenderer';
const evidence=JSON.parse(readFileSync('client/public/data/score-movers-2026.json','utf8'));
assert.equal(new Set(blogPosts.map(p=>p.slug)).size,blogPosts.length,'Unique canonical blog slugs');
assert.equal(SCORE_ARTICLES.length,6,'One upgraded hub, five new posts');
for(const [key,report] of [...Object.entries(data.assessments),...Object.entries(data.regents)]) {
  const rows=key==='ela'||key==='math'?evidence.assessments[key]:evidence.regents[key].pairs;
  assert.equal(report.eligible,rows.length);
  const desc=[...rows].filter(r=>r.change>0).sort((a,b)=>b.change-a.change||a.dbn.localeCompare(b.dbn)).slice(0,10);
  const asc=[...rows].filter(r=>r.change<0).sort((a,b)=>a.change-b.change||a.dbn.localeCompare(b.dbn)).slice(0,10);
  assert.deepEqual(report.gains,desc);assert.deepEqual(report.declines,asc);
  assert.equal(report.increased+report.decreased+report.unchanged,report.eligible);
  if(key==='ela'||key==='math') {
    for(const stage of ['elementary','middle']) {
      for(const direction of ['gains','declines'] as const) {
        const expected=(direction==='gains'?desc:asc).filter(r=>r.testedGrades.some(g=>stage==='elementary'?g<=5:g>=6));
        // Full sample determines the stage ranking, including beyond the city top ten.
        const all=rows.filter(r=>r.testedGrades.some(g=>stage==='elementary'?g<=5:g>=6)&& (direction==='gains'?r.change>0:r.change<0))
          .sort((a,b)=>(direction==='gains'?b.change-a.change:a.change-b.change)||a.dbn.localeCompare(b.dbn)).slice(0,3);
        assert.deepEqual(report.stageMovers[stage][direction],all);
      }
    }
  }
  for(const r of [...report.gains,...report.declines]) {
    assert.ok(r.previousTested>=50&&r.currentTested>=50);
    assert.equal(r.href,`/school/${getSchoolSlug({dbn:r.dbn,name:r.name})}`);
    assert.ok(Math.abs(r.change-Number((r.current-r.previous).toFixed(1)))<0.001);
    assert.ok(r.previous>=0&&r.previous<=100&&r.current>=0&&r.current<=100);
  }
}
for(const key of ['english','algebra']) {
  assert.equal(data.regents[key].comparable,false);
  assert.equal(data.regents[key].gains.length,0);
  assert.ok(data.regents[key].reason.length>100);
}
assert.ok(data.assessments.ela.gains[0].change>0);
assert.ok(data.assessments.ela.declines[0].change<0);
const base='<html><head><title>Base</title><meta property="og:type" content="website"/></head><body><div id="root"></div></body></html>';
const sitemap=await sitemapByName('blog');
for(const page of SCORE_ARTICLES) {
  const html=renderToStaticMarkup(React.createElement(ScoreArticleContent,{page}));
  assert.equal((html.match(/<h1/g)||[]).length,1);
  assert.ok(html.includes('data-score-chart='));
  assert.ok(html.includes('2025')&&html.includes('2026'));
  assert.ok(html.includes('/data/score-movers-2026.json'));
  assert.ok(html.includes('Scoring 80+')||page.kind==='assessment'||page.kind==='hub'||page.kind==='regents');
  assert.ok(!html.includes('Not imported into school ratings'));
  assert.ok(!html.includes('while waiting for final school-level'));
  if(page.kind==='snapshot') {
    assert.ok(html.includes('2026 snapshot only'));
    assert.ok(html.includes('Regents reporting year 2026 only'));
    assert.ok(!html.includes('Largest Common Core English gains'));
  }
  const schema=scoreArticleSchema(page)[0] as any;
  assert.equal(schema.dateModified,'2026-11-07');
  const ssr=await renderSeoHtml('/blog/'+page.slug,base);
  assert.ok(ssr?.includes('data-score-article='+`"${page.slug}"`));
  assert.ok(ssr?.includes('content="article"'));
  assert.ok(ssr?.includes('/blog/'+page.slug));
  assert.ok(sitemap?.includes(`/blog/${page.slug}</loc>`));
}
for(const stage of ['elementary','middle','high'] as const) {
  const html=renderToStaticMarkup(React.createElement(ScoreMoversTeaser,{stage}));
  assert.ok(html.includes(stage==='high'?'Regents results':'2025–2026'));
  assert.ok(html.includes(stage==='high'?'/blog/nyc-regents-results-2026-by-school':'/blog/nyc-ela-scores-2026'));
}
assert.equal(await getCanonicalRedirectPath('/insights/nys-test-results-2026'),'/blog/nys-test-results-2026');
clearSeoCache();
console.log('Score movers: complete-cohort ranking order, year labels, source limits, canonical SSR, metadata and stage entries passed.');
