import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {getSchoolUrl} from '../../shared/schema';
const live=process.argv.includes('--live'),base=live?'https://nycschoolsratings.com':'http://127.0.0.1:8796',passed:string[]=[];
async function page(path:string){const r=await fetch(base+path,{redirect:'manual'});assert.equal(r.status,200,`${path}: ${r.status}`);assert.equal(r.headers.get('X-Migration-Maintenance'),null);return {r,text:await r.text()};}
const home=await page('/');assert.ok(home.text.includes('NYC School'));assert.ok(!home.r.headers.get('x-robots-tag')?.includes('noindex'));passed.push('homepage served without staging/maintenance headers');
const robots=await page('/robots.txt');assert.ok(!/^Disallow:\s*\/$/m.test(robots.text));passed.push('public robots not staging-blocked');
const sitemap=await page('/sitemap.xml');assert.ok(sitemap.text.includes('nycschoolsratings.com'));passed.push('production sitemap');
for(const id of ['02M475','06G262']){const r=await fetch(base+'/api/schools/'+id);assert.equal(r.status,200);const school=await r.json();const profile=await page(getSchoolUrl(school));assert.ok(profile.text.includes(school.name));assert.ok(profile.text.includes('https://nycschoolsratings.com/school/'));passed.push(`${id} canonical school profile`);}
const login=await page('/login');assert.ok(/noindex/.test(login.text)||login.r.headers.get('x-robots-tag')?.includes('noindex'));passed.push('login remains noindex');
const stripe=await (await fetch(base+'/api/stripe/config')).json();assert.equal(stripe.mode,'live');assert.ok(stripe.publishableKey.startsWith('pk_live_'));passed.push('existing live Stripe configuration available (no charge created)');
const rejected=await fetch(base+'/api/stripe/webhook',{method:'POST',headers:{'Content-Type':'application/json','stripe-signature':'t=1,v1=invalid'},body:'{}'});assert.equal(rejected.status,400);passed.push('invalid webhook rejected');
const auth=await fetch(base+'/api/auth/user');assert.equal(auth.status,200);assert.equal(await auth.json(),null);assert.equal((await fetch(base+'/api/favorites')).status,401);passed.push('anonymous account response contains no user; private favorites rejected');
await writeFile(`.wrangler/d1-production-${live?'live':'candidate'}-http.json`,JSON.stringify({checkedAt:new Date().toISOString(),passed},null,2));console.log(JSON.stringify({passed},null,2));
