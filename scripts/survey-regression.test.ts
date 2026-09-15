import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs/promises';
import { parseSurveyNumber, surveyCaution, type SurveyResult } from '../shared/surveys';
import { SURVEY_INSIGHTS } from '../shared/survey-insights';
import { SurveyResultsContent } from '../shared/SurveyResultsContent';
import { renderSeoHtml, getCanonicalRedirectPath } from '../server/seoRenderer';
import { blogPosts } from '../shared/blog-data';
import { relatedBlogLinks } from '../shared/RelatedBlogReading';
import { sitemapByName } from '../server/seoFeeds';
import { matchSurveyIdentity } from '../shared/survey-matching';
import { surveyStories } from '../shared/survey-stories';
import { analysisFor, topicFor } from '../shared/survey-analysis';
import { quantile } from '../shared/survey-statistics';
import { scoreBand, surveyNarrative } from '../shared/survey-presentation';
import { externalRel, isExternalWebLink } from '../shared/external-links';

const ids=new Set(['18KAVQ','01M015']);
const centers=[{id:1,locCode:'KAVQ',semsCode:'18KAVQ'}];
assert.equal(matchSurveyIdentity(' kavq ','b5-family',ids,centers).schoolDbn,'18KAVQ');
assert.equal(matchSurveyIdentity('KAVQ','k12-family',ids,centers).schoolDbn,null);
assert.equal(matchSurveyIdentity('UNKNOWN','b5-family',ids,centers).method,'unmatched');
assert.throws(()=>matchSurveyIdentity('KAVQ','b5-family',ids,[...centers,...centers]));
assert.equal(matchSurveyIdentity('01M015','k12-family',ids,centers).method,'dbn');

assert.equal(parseSurveyNumber('N/A',100),null);
assert.equal(parseSurveyNumber(null,100),null);
assert.equal(parseSurveyNumber(0,100),0);
assert.equal(parseSurveyNumber(100,100),100);
for (const invalid of [-1,101,NaN,Infinity,'50']) assert.throws(()=>parseSurveyNumber(invalid,100));
assert.throws(()=>parseSurveyNumber(50,1));
assert.match(surveyCaution('k12-student'),/Do not compare/);
assert.match(surveyCaution('b5-family'),/not results for a specific 2-K/);
const result: SurveyResult = {year:2026,instrument:'b5-family',sourceId:'TEST',sourceName:'<script>alert(1)</script>',sourceHash:'abc',sourceUrl:'https://example.org',importedAt:'2026-09-15',responseCount:4,responseRate:null,metrics:[{key:'Safety',label:'Safety',value:0,status:'reported'},{key:'Trust',label:'Trust',value:null,status:'not_reported'}]};
const content = renderToStaticMarkup(React.createElement(SurveyResultsContent,{results:[result]}));
assert.equal(renderToStaticMarkup(React.createElement(SurveyResultsContent,{results:[]})), '');
assert.match(content,/Not reported/); assert.match(content,/Small response count/); assert.match(content,/>0<\/td>/); assert(!content.includes('<script>'));
const template = await fs.readFile('client/index.html','utf8');
for (const page of SURVEY_INSIGHTS) {
  const rendered = await renderSeoHtml(`/blog/${page.slug}`,template);
  assert(rendered); assert(rendered.includes(page.description));
  assert(rendered.includes('content="article"')); assert(rendered.includes(`https://nycschoolsratings.com/blog/${page.slug}`));
  for (const section of surveyStories[page.slug]?.sections??page.sections) assert(rendered.includes(section.title.replaceAll('&','&amp;')));
  if(surveyStories[page.slug]){assert(rendered.includes('<figure'));assert(rendered.includes('<table'));assert(rendered.includes('Questions parents ask'));}
  assert(rendered.includes('BreadcrumbList')); assert(rendered.includes('Article'));
}
assert.equal(await renderSeoHtml('/blog/not-real',template),null);
const sitemap = await sitemapByName('blog');
for (const page of SURVEY_INSIGHTS) assert(sitemap?.includes(`/blog/${page.slug}`));
assert(!sitemap?.includes('/insights/'));
assert(!(await sitemapByName('guides'))?.includes('/insights/'));
assert.equal(new Set(blogPosts.map(p=>p.slug)).size, blogPosts.length);
for (const page of SURVEY_INSIGHTS) {
  assert.equal(await getCanonicalRedirectPath(`/insights/${page.slug}`), `/blog/${page.slug}`);
  assert((await renderSeoHtml('/blog',template))?.includes(`/blog/${page.slug}`));
  assert(relatedBlogLinks(page.slug).length > 0);
  for (const {post} of relatedBlogLinks(page.slug)) {
    assert(post);
    assert(relatedBlogLinks(post.slug).some(link=>link.post.slug===page.slug));
    assert((await renderSeoHtml(`/blog/${post.slug}`,template))?.includes(`/blog/${page.slug}`));
  }
}
assert.equal(await getCanonicalRedirectPath('/insights/not-real'),null);
const sql = await fs.readFile('migrations/20260915_surveys.sql','utf8');
assert(!/UPDATE\s+schools|DELETE\s+FROM\s+schools|ALTER\s+TABLE\s+schools/i.test(sql));
console.log('Survey tests passed: missing/zero/range guards, caution labels, escaping, SSR content, metadata, unknown routes, sitemap and additive migration.');
assert.equal(quantile([], .5),null);assert.equal(quantile([0,50,100],.5),50);assert.equal(quantile([1,2,3,4],.25),1.75);
assert.equal(analysisFor('b5-teacher').withScores,151);
assert.equal(analysisFor('b5-teacher').rows,1057);
assert.equal(topicFor('k12-family',"Family Satisfaction with Child's Education")?.median,94);
assert.equal(topicFor('k12-teacher','Teacher Influence')?.median,68);
assert.equal(topicFor('b5-teacher','Safety')?.median,null);
for(const instrument of ['k12-family','k12-teacher','k12-student','b5-family','b5-teacher'] as const){for(const t of analysisFor(instrument).topics){assert.equal(t.bins.reduce((n,b)=>n+b.count,0),t.n);assert(t.n<=analysisFor(instrument).rows);if(t.median!==null)assert(t.q1!<=t.median&&t.median<=t.q3!);}}
assert.match(scoreBand(0).label,/Lower/);assert.match(scoreBand(70).label,/Middle/);assert.match(scoreBand(90).label,/Higher/);assert.equal(scoreBand(null).label,'Not reported');
const noScores={...result,metrics:result.metrics.map(m=>({...m,value:null,status:'not_reported' as const}))};
assert.match(surveyNarrative(noScores).title,/not published/);
const blankHtml=renderToStaticMarkup(React.createElement(SurveyResultsContent,{results:[noScores]}));assert(!blankHtml.includes('<dl'));
const base='https://nycschoolsratings.com';
for(const href of ['/school/test','#finding-1','mailto:hello@example.com','tel:123','https://www.nycschoolsratings.com/about'])assert(!isExternalWebLink(href,base));
for(const href of ['https://infohub.nyced.org/file','//example.org','https://nycschoolsratings.com.evil.example/'])assert(isExternalWebLink(href,base));
assert.equal(externalRel('sponsored opener'),'sponsored nofollow noopener noreferrer');assert.equal(externalRel(externalRel(null)),externalRel(null));
console.log('Survey redesign tests passed: evidence coverage, descriptive bands, SSR charts/tables, missing scores and external-link classification.');
const profileSource=await fs.readFile('client/src/pages/school-detail.tsx','utf8');
const surveyPosition=profileSource.indexOf('<SchoolSurveySection');
assert(surveyPosition>profileSource.lastIndexOf('<CardTitle>Historical Trends</CardTitle>'));
assert(surveyPosition<profileSource.indexOf('<CardTitle>Attendance &amp; Chronic Absenteeism</CardTitle>') || surveyPosition<profileSource.indexOf('<CardTitle>Attendance & Chronic Absenteeism</CardTitle>'));
assert.equal((profileSource.match(/<SchoolSurveySection/g)||[]).length,1);
