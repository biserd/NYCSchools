/** Loopback-only, read-only preview of the three pilot surfaces. */
import {createServer} from 'node:http';
import React from 'react';
import {readFile} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {renderToStaticMarkup} from 'react-dom/server';
import {ClassroomPilotDistrict,ClassroomPilotDraft,ClassroomPilotSchool,PILOT_DRAFT_TITLE} from '../shared/ClassroomPilotContent';
import {PILOT_API,PILOT_DISTRICT_PATH,PILOT_DRAFT_PATH,PILOT_SCHOOL_PATH} from '../shared/classroomPilot';
import {getSchoolSlug} from '../shared/school-utils';
import {loadClassroomPilot} from '../server/classroomPilot';
import {openPilotSqlite} from './data/classroom-pilot-sqlite';

const root=resolve('dist/public');
const shell=await readFile(resolve(root,'index.html'),'utf8');
const mime:Record<string,string>={'.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.avif':'image/avif','.jpg':'image/jpeg','.ico':'image/x-icon','.woff2':'font/woff2'};
const base='https://nycschoolsratings.com';
const cache=new Map<string,string>();
async function getPublic(path:string):Promise<string> {
  const cached=cache.get(path);
  if(cached!==undefined) return cached;
  const response=await fetch(base+path,{redirect:'error',signal:AbortSignal.timeout(15_000),headers:{accept:'application/json'}});
  if(!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error('Public school data unavailable');
  const body=await response.text();
  cache.set(path,body);
  return body;
}
const {db,read}=openPilotSqlite();
const schools=JSON.parse(await getPublic('/api/schools')) as Array<{dbn:string;name:string}>;
if(!Array.isArray(schools) || !schools.some(x=>x.dbn==='02M158')) throw new Error('Unexpected public school roster');
const insert=db.prepare('INSERT INTO schools VALUES (?,?)');
const paths=new Set<string>();
for(const s of schools) { insert.run(s.dbn,s.name); paths.add('/school/'+getSchoolSlug(s)); }
const data=await loadClassroomPilot(read);
if(!data) throw new Error('Validated pilot data is missing');

const rendered:Record<string,{title:string,content:string}>={
  [PILOT_SCHOOL_PATH]:{title:'P.S. 158 Bayard Taylor',content:renderToStaticMarkup(<ClassroomPilotSchool data={data}/>)},
  [PILOT_DISTRICT_PATH]:{title:'NYC District 2 Schools: Ratings and Comparison',content:renderToStaticMarkup(<ClassroomPilotDistrict data={data}/>)},
  [PILOT_DRAFT_PATH]:{title:PILOT_DRAFT_TITLE,content:renderToStaticMarkup(<ClassroomPilotDraft data={data}/>)},
};
const port=Number(process.env.CLASSROOM_PILOT_PORT||8799);
createServer(async(req,res)=>{
  res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET'){res.writeHead(405).end();return;}
  try{
    const {pathname}=new URL(req.url||'/','http://127.0.0.1');
    if(pathname==='/robots.txt') return res.end('User-agent: *\nDisallow: /\n');
    if(pathname.startsWith('/api/')){
      res.setHeader('Content-Type','application/json');
      if(pathname===PILOT_API) return res.end(JSON.stringify(data));
      const allowlisted=/^\/api\/schools(?:\/[0-9]{2}[A-Z0-9]{4}(?:\/(?:history|graduation|regents|attendance|discipline|admissions-programs|admissions|research-data|demographics-history|survey|zone))?)?$/;
      if(allowlisted.test(pathname)) {
        try{return res.end(await getPublic(pathname));}catch{return res.writeHead(502).end('{"message":"Public school data unavailable"}');}
      }
      return res.writeHead(401).end('{"message":"Anonymous read-only preview"}');
    }
    const file=resolve(root,'.'+decodeURIComponent(pathname));
    if(file!==root&&!file.startsWith(root+sep)) return res.writeHead(403).end();
    if(extname(pathname)){
      try{const body=await readFile(file);res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');return res.end(body);}
      catch{return res.writeHead(404).end();}
    }
    if(pathname==='/') return res.writeHead(302,{location:PILOT_SCHOOL_PATH+'#enrollment-and-class-size'}).end();
    const page=rendered[pathname];
    if(!page&&!paths.has(pathname)) return res.writeHead(404).end('Not available in this preview');
    res.setHeader('Content-Type','text/html; charset=utf-8');
    const markup=page
      ? shell.replace(/<title>[\s\S]*?<\/title>/i,`<title>${page.title}</title>`)
        .replace('</head>','<meta name="classroom-pilot" content="enabled" /><meta name="robots" content="noindex, nofollow" /></head>')
        .replace('<div id="root"></div>',`<div id="root"><main class="container mx-auto px-4 py-8">${pathname===PILOT_DRAFT_PATH?'':`<h1 class="mb-6 text-3xl font-bold">${page.title}</h1>`}${page.content}</main></div>`)
      : shell;
    return res.end(markup);
  }catch(error){console.error('[PILOT_PREVIEW]',error);return res.writeHead(500).end('Preview unavailable');}
}).listen(port,'127.0.0.1',()=>console.log(`Read-only classroom preview: http://127.0.0.1:${port}`));
