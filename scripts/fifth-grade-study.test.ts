import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { FIFTH_GRADE_POST as post,FIFTH_GRADE_URL as url,gradeFiveStudy as study,studySubjects } from '../shared/fifth-grade-class-size-study';
import { getBlogPost } from '../shared/blog-data';
import { relatedBlogLinks } from '../shared/RelatedBlogReading';
import { renderSeoHtml } from '../server/seoRenderer';
import { sitemapByName,sitemapIndex } from '../server/seoFeeds';

assert.equal(getBlogPost(post.slug),post);
assert.equal(study.bands.reduce((n,b)=>n+b.schools,0),study.modelSchools);
assert.equal(study.bands[0].rates.Science.toFixed(1),'38.3');
assert.equal(study.bands[2].rates.Science.toFixed(1),'47.1');
for(const s of studySubjects){
  const e=study.estimates[s];
  assert.ok(e.low<0&&e.high>0&&e.adjusted>e.low&&e.adjusted<e.high);
  assert.ok(Math.abs(e.adjusted)<e.current);
}
assert.ok(relatedBlogLinks('does-falling-enrollment-mean-smaller-classes').some(l=>l.post.slug===post.slug));
assert.match(sitemapIndex(),/\/sitemaps\/blog\.xml/);
assert.ok((await sitemapByName('blog'))?.includes(`https://nycschoolsratings.com${url}`));
const source=await renderSeoHtml(url,readFileSync('client/index.html','utf8'));
assert.ok(source);
assert.match(source,/<title>NYC Fifth-Grade Class Size vs\. Test Scores \(2026\)<\/title>/);
assert.match(source,/<h1>Why Bigger Fifth-Grade Classes Looked Better in NYC’s Test Data<\/h1>/);
assert.match(source,/\"@type\":\"Article\"/);
assert.match(source,/<meta property="og:type" content="article"/);
assert.match(source,/<meta property="og:image:width" content="1536"/);
assert.match(source,/<meta name="robots" content="index, follow"/);
assert.match(source,/38\.3% science proficiency/);
assert.match(source,/47\.1%/);
for(const part of ['band-chart','timeline','prior-chart','adjusted-chart','cohort-chart']) assert.ok(source.includes(`grade5-${part}`),part);
assert.match(source,/nofollow noopener noreferrer/);
const png=readFileSync('client/public'+post.featuredImage);
assert.ok(png.length<350_000);
assert.equal(png.readUInt32BE(16),1536);
assert.equal(png.readUInt32BE(20),864);
if(process.argv.includes('--audit')){
  const raw=JSON.parse(execFileSync(process.env.PYTHON||'python',['scripts/data/analyze_fifth_grade_class_sizes.py'],{encoding:'utf8'}));
  assert.deepEqual([raw.eligible,raw.all_exact_spring2026,raw.sensitivity.tested_1.N,raw.common,raw.districts],
    [study.eligibleSchools,study.springResultSchools,study.pairedSchools,study.modelSchools,study.districts]);
  for(const [i,key] of ['under20','20to24','24andup'].entries()){
    const band=study.bands[i], actual=raw.band_stats[key];
    assert.deepEqual([band.schools,band.avgSize,band.rates],[actual.N,actual.mean_size,actual.rates]);
  }
  for(const s of studySubjects){
    const e=study.estimates[s], a=raw.outcomes[s];
    assert.deepEqual([e.prior,e.current,e.adjusted,e.low,e.high],[a.before_exposure[0],a.raw[0],...a.adjusted]);
  }
}
console.log('Fifth-grade study: source snapshot, SSR charts, canonical SEO, share image, reciprocal links and sitemap verified.');
