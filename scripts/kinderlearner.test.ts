import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { KINDERLEARNER, KINDERLEARNER_PAGES, KL_FAQS, getKinderLearnerPage, kinderLearnerSchemas, kinderLearnerStartHref, type KinderLearnerPage } from '../shared/kinderlearner';
import { KinderLearnerContent } from '../shared/KinderLearnerContent';
import { KINDERLEARNER_INFO_PAGES, getKinderLearnerInfoPage, kinderLearnerInfoSchemas, type KinderLearnerInfoPage } from '../shared/kinderlearner-info';
import { KinderLearnerInfoContent } from '../shared/KinderLearnerInfoContent';
import { renderSeoHtml } from '../server/seoRenderer';
import { sitemapByName } from '../server/seoFeeds';
import { getBlogPost } from '../shared/blog-data';
import { getSeoLanding } from '../shared/seo-landings';

const base = readFileSync('client/index.html','utf8');
const sitemap = await sitemapByName('static');
const allowedLinks = new Set(['/', '/family','/privacy','/terms','/contact','/kinderlearner/support#current-build',...Object.values(KINDERLEARNER_PAGES).map(p=>p.path),...Object.values(KINDERLEARNER_INFO_PAGES).map(p=>p.path)]);
for (const [key,meta] of Object.entries(KINDERLEARNER_PAGES)) {
  const page = key as KinderLearnerPage;
  const markup = renderToString(React.createElement(KinderLearnerContent,{page}));
  const html = await renderSeoHtml(meta.path,base);
  assert.ok(html?.includes(markup),'server must render identical complete React content');
  assert.equal((markup.match(/<h1[ >]/g)||[]).length,1);
  assert.ok(markup.includes(meta.heading));
  assert.ok(markup.includes('iPhone &amp; iPad apps coming soon'));
  assert.ok(markup.includes('iOS &amp; iPadOS · Coming soon'));
  assert.ok(!/KinderQuest|Kinder Learner|Kinderlearner|TODO|Lorem ipsum/.test(markup.replace(/<[^>]+>/g,'')));
  assert.ok(html!.includes(`href="https://nycschoolsratings.com${meta.path}"`));
  const decode = (text:string) => text.replaceAll('&amp;','&').replaceAll('&#39;',"'").replaceAll('&quot;','"');
  assert.equal(decode(html!.match(/<title>(.*?)<\/title>/)![1]),meta.title);
  assert.equal(decode(html!.match(/<meta name="description" content="([^"]*)"/)![1]),meta.description);
  assert.ok(html!.includes('data-kinderlearner="true"'));
  assert.ok(!html!.includes('maximum-scale=1'), 'product pages must allow pinch zoom');
  const schemaBlocks = [...html!.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1]));
  assert.deepEqual(schemaBlocks,kinderLearnerSchemas(page));
  assert.equal(schemaBlocks[2].mainEntity.length, KL_FAQS[page].length);
  assert.ok(!JSON.stringify(schemaBlocks).match(/aggregateRating|reviewCount|offers|price|downloadUrl/));
  assert.ok(sitemap?.includes(`https://nycschoolsratings.com${meta.path}`));
  assert.equal(getKinderLearnerPage(meta.path + '/'),page);
  const ids = [...markup.matchAll(/ id="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(ids).size,ids.length);
  for(const match of markup.matchAll(/href="([^"]+)"/g)) {
    const href=match[1];
    if(href.startsWith('#')) assert.ok(ids.includes(href.slice(1)),href);
    else if(href.startsWith('/blog/')) assert.ok(getBlogPost(href.slice(6)),href);
    else if(href.startsWith('/program/')) assert.ok(getSeoLanding('program',href.slice(9)),href);
    else assert.ok(allowedLinks.has(href),href);
  }
  console.log(`${meta.path}: SSR, metadata, canonical, one H1, schema, copy, anchors, internal links and sitemap passed`);
}
assert.equal(getKinderLearnerPage('/kinderlearner/not-a-page'),undefined);
for (const [key, meta] of Object.entries(KINDERLEARNER_INFO_PAGES)) {
  const page = key as KinderLearnerInfoPage;
  const markup = renderToString(React.createElement(KinderLearnerInfoContent,{page}));
  const html = await renderSeoHtml(meta.path,base);
  assert.ok(html?.includes(markup));
  assert.equal((markup.match(/<h1[ >]/g)||[]).length,1);
  assert.ok(html!.includes(`href="https://nycschoolsratings.com${meta.path}"`));
  assert.ok(sitemap?.includes(`https://nycschoolsratings.com${meta.path}`));
  assert.ok(!html!.includes('maximum-scale=1'));
  assert.equal(getKinderLearnerInfoPage(meta.path+'/'),page);
  const schemas = [...html!.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)].map(m=>JSON.parse(m[1]));
  assert.deepEqual(schemas,kinderLearnerInfoSchemas(page));
  for (const link of [...markup.matchAll(/href="([^"]+)"/g)].map(m=>m[1])) {
    if (link.startsWith('/')) assert.ok(allowedLinks.has(link),link);
    else assert.ok(link.startsWith('#')||link.startsWith('mailto:hello@bigappledigital.nyc')||link==='https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',link);
  }
  console.log(`${meta.path}: support/legal SSR, canonical, links, schemas and sitemap passed`);
}
const privacy = renderToString(React.createElement(KinderLearnerInfoContent,{page:'privacy'}));
assert.ok(privacy.includes('Google Analytics') && privacy.includes('Cloudflare D1'));
assert.ok(privacy.includes('Effective: September 26, 2026'));
assert.equal((privacy.match(/<h2>/g)||[]).length,21,'all 21 owner-supplied policy sections must be present');
for (let section = 1; section <= 21; section++) assert.ok(privacy.includes(`<h2>${section}. `));
assert.ok(privacy.includes('Big Apple Digital LLC'));
assert.ok(!privacy.includes('Biser Mitkov Dimitrov'));
assert.ok(!/LEGAL OPERATOR NAME|BUSINESS MAILING ADDRESS|BUSINESS TELEPHONE|PROVIDER LEGAL NAME|HTTPS PRODUCTION URL/.test(privacy));
assert.ok(privacy.includes('Verification-email delivery</h3><p><strong>Cloudflare, Inc.</strong>'));
assert.ok(!/data-policy-review|Before publication|\[24\/36\]|\[7\/30\]|Keep the following statement|proposed statement/.test(privacy),'confirmed policy must not retain editorial notes');
assert.ok(privacy.includes('KinderLearner does not use children&#x27;s learning records to train generative AI models.') || privacy.includes('KinderLearner does not use children&#39;s learning records to train generative AI models.'));
assert.ok(privacy.includes('inactive for 24 months'));
assert.ok(privacy.includes('recoverable for up to 7 days'));
assert.ok(privacy.includes('The KinderLearner iPhone and iPad app does not use Google Analytics.'));
assert.ok(privacy.includes('Only the separate, adult-facing marketing website uses Google Analytics'));
assert.ok(privacy.includes('mailto:hello@bigappledigital.nyc'));
assert.ok(renderToString(React.createElement(KinderLearnerInfoContent,{page:'terms'})).includes('KinderLearner is provided by Big Apple Digital LLC.'));
const deletion = renderToString(React.createElement(KinderLearnerInfoContent,{page:'deletion'}));
assert.ok(deletion.includes('Delete account') && deletion.includes('other devices'));
assert.equal(kinderLearnerStartHref(), '#start-kinderlearner');
assert.equal(kinderLearnerStartHref('javascript:alert(1)'), '#start-kinderlearner');
assert.equal(kinderLearnerStartHref('http://example.com/app'), '#start-kinderlearner');
assert.equal(kinderLearnerStartHref('https://example.com/app'), 'https://example.com/app');
const originalLaunchUrl = KINDERLEARNER.launchUrl;
try {
  KINDERLEARNER.launchUrl = 'javascript:alert(1)';
  assert.ok(renderToString(React.createElement(KinderLearnerContent, {page:'home'})).includes('id="start-kinderlearner"'));
  KINDERLEARNER.launchUrl = 'https://example.com/app';
  const launched = renderToString(React.createElement(KinderLearnerContent, {page:'home'}));
  assert.ok(!launched.includes('id="start-kinderlearner"'));
  assert.ok(launched.includes('href="https://example.com/app" target="_blank" rel="nofollow noopener noreferrer"'));
} finally { KINDERLEARNER.launchUrl = originalLaunchUrl; }
const css = readFileSync('client/public/kinderlearner.css','utf8');
assert.ok(css.includes('prefers-reduced-motion'));
assert.ok(css.includes(':focus-visible'));
console.log('KinderLearner regression suite passed');
