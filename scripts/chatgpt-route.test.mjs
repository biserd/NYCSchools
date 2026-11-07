import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {once} from 'node:events';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import express from 'express';
import {build} from 'esbuild';

const template=readFileSync('dist/public/index.html','utf8');
globalThis.__chatgptRouteEnv={APP_URL:'https://nycschoolsratings.com',ASSETS:{fetch:async()=>new Response(template,{headers:{'Content-Type':'text/html'}})}};
mkdirSync('dist/route-tests',{recursive:true});
const outfile=resolve('dist/route-tests/worker-static.mjs');
await build({entryPoints:['server/workerStatic.ts'],outfile,bundle:true,platform:'node',format:'esm',packages:'external',plugins:[{
  name:'mock-cloudflare-env',
  setup(builder){
    builder.onResolve({filter:/^cloudflare:workers$/},()=>({path:'worker-env',namespace:'test-env'}));
    builder.onLoad({filter:/.*/,namespace:'test-env'},()=>({contents:'export const env = globalThis.__chatgptRouteEnv;',loader:'js'}));
  },
}]});
const {registerWorkerStaticRoutes}=await import(pathToFileURL(outfile));
const app=express();
registerWorkerStaticRoutes(app);
const server=app.listen(0,'127.0.0.1');
await once(server,'listening');
try {
  const base=`http://127.0.0.1:${server.address().port}`;
  const response=await fetch(base+'/chatgpt');
  assert.equal(response.status,200);
  assert((await response.text()).includes('Find and compare NYC schools in ChatGPT.'));
  const markdown=await fetch(base+'/chatgpt',{headers:{Accept:'text/markdown'}});
  assert.equal(markdown.status,200);
  assert.match(markdown.headers.get('Content-Type'),/^text\/markdown/);
  assert.match(markdown.headers.get('Vary'),/Accept/);
  assert((await markdown.text()).includes('https://chatgpt.com/plugins/plugin_asdk_app_69442a811a748191a2a59383a0b7905c'));
  const head=await fetch(base+'/chatgpt',{method:'HEAD'});
  assert.equal(head.status,200);assert.equal(await head.text(),'');
  const trailing=await fetch(base+'/chatgpt/');
  assert.equal(trailing.status,200);
  assert((await trailing.text()).includes('rel="canonical" href="https://nycschoolsratings.com/chatgpt"'));
  const unknown=await fetch(base+'/unknown-chatgpt-route');
  assert.equal(unknown.status,404);
  assert((await unknown.text()).includes('content="noindex, nofollow"'));
  const privatePage=await fetch(base+'/family',{headers:{Accept:'text/markdown'}});
  assert.match(privatePage.headers.get('Content-Type'),/^text\/html/);
  console.log('Production middleware passed: /chatgpt HTML/HEAD/Markdown, trailing slash canonical, unknown 404s and private-page exclusion. No database, email or external API used.');
} finally {server.close();delete globalThis.__chatgptRouteEnv;}
