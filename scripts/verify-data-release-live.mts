import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DATA_RELEASE,DATA_RELEASE_RESOURCES,dataReleaseResourcePath} from '../shared/data-release';
import {SCORE_ARTICLES} from '../shared/score-articles';
import {submitIndexNow} from '../server/seoFeeds';
const origin='https://nycschoolsratings.com';
const html=await fetch(origin+DATA_RELEASE.path).then(async r=>{assert.equal(r.status,200);return r.text();});
assert.ok(html.includes('data-release-article')&&html.includes('NewsArticle'));
assert.ok(html.includes('not a new government data release'));
assert.ok(html.includes(origin+DATA_RELEASE.path));
const resources=await Promise.all(DATA_RELEASE_RESOURCES.map(async resource=>{
  const path=dataReleaseResourcePath(resource.file),response=await fetch(origin+path);
  assert.equal(response.status,200,path);
  const remote=Buffer.from(await response.arrayBuffer()),local=readFileSync('client/public'+path);
  const sha=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
  assert.equal(sha(remote),sha(local),path+' deployed bytes');
  return {id:resource.id,path,status:response.status,bytes:remote.length,contentType:response.headers.get('content-type'),exactMatch:true};
}));
const sitemap=await fetch(origin+'/sitemaps/blog.xml').then(r=>r.text());assert.ok(sitemap.includes(DATA_RELEASE.path));
for(const path of ['/','/blog','/blog/nys-test-results-2026']) {
  const body=await fetch(origin+path).then(r=>r.text());assert.ok(body.includes(DATA_RELEASE.path),path+' release discovery');
}
let indexNow:{status:number;submitted:number;accepted:boolean}|undefined;
if(process.argv.includes('--submit-indexnow')) {
  const config=JSON.parse(readFileSync('wrangler.jsonc','utf8'));
  const key=config.vars.INDEXNOW_KEY;assert.ok(key);
  const keyCheck=await fetch(origin+'/'+key+'.txt');assert.equal(keyCheck.status,200);assert.equal((await keyCheck.text()).trim(),key);
  const urls=[DATA_RELEASE.path,'/','/blog',...SCORE_ARTICLES.map(p=>'/blog/'+p.slug)];
  const result=await submitIndexNow(urls,key);
  indexNow={status:result.status,submitted:urls.length,accepted:result.status===200||result.status===202};
  assert.ok(indexNow.accepted,'IndexNow accepted publication notification');
}
mkdirSync('.wrangler/data-release',{recursive:true});
const report={checkedAt:new Date().toISOString(),releaseUrl:origin+DATA_RELEASE.path,resources,sitemap:true,discoveryLinks:true,indexNow,indexingConfirmed:false};
writeFileSync('.wrangler/data-release/live-validation.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
