/** Public data only, two loopback ports, no remote requests or writes. */
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {extname,resolve,sep} from 'node:path';
import {buildNysedProfileAssessments,type AssessmentRow} from '../shared/nysed-profile-assessments';

const dir='.wrangler/nysed-assessments';
const root=resolve('dist/public');
const index=await readFile(resolve(root,'index.html'),'utf8');
const schools=JSON.parse(await readFile(dir+'/source/staging-schools.json','utf8')) as Record<string,unknown>[];
const profileMetadata=await readFile(dir+'/source/staging-profile-metadata.json','utf8').then(raw=>JSON.parse(raw) as Record<string,unknown>[]).catch(error=>{
  if(error.code==='ENOENT') return [];
  throw error;
});
const metadata=new Map(profileMetadata.map(s=>[s.dbn,s]));
for(const school of schools) Object.assign(school,metadata.get(school.dbn));
const schoolMap=new Map(schools.map(s=>[s.dbn,s]));
const release=JSON.parse(await readFile(dir+'/combined/coverage.json','utf8'));
const results=JSON.parse(await readFile(dir+'/staging-assessment-results.json','utf8')) as {
  dbn:string; subject:AssessmentRow['subject']; assessment:string; grade:number; spring_year:number; definition:string;
  institution_id:string; beds_code:string; tested:number|null; proficient:number|null;
  published_percent:number|null; result_status:AssessmentRow['status'];
}[];
const districts=JSON.parse(await readFile(dir+'/staging-district-science.json','utf8')) as {
  district:number; release_id:string; spring_year:number; assessment:string; definition:string; beds_code:string; tested:number; proficient:number;
}[];
const benchmarks=new Map(districts.map(d=>[[d.district,d.release_id,d.spring_year,d.assessment,d.definition,d.beds_code].join('|'),d]));
const bySchool=new Map<string,AssessmentRow[]>();
for(const row of results){
  const district=row.subject==='science'&&row.beds_code.slice(6,8)==='01' ? benchmarks.get([
    Number(row.dbn.slice(0,2)),release.release_id,row.spring_year,row.assessment,row.definition,row.beds_code.slice(0,8)+'0000',
  ].join('|')) : undefined;
  const r:AssessmentRow={subject:row.subject,assessment:row.assessment,grade:row.grade,year:row.spring_year,
    definition:row.definition,institutionId:row.institution_id,bedsCode:row.beds_code,releaseId:release.release_id,
    releasedOn:release.release_date,sourceUrl:release.source_url,tested:row.tested,proficient:row.proficient,
    publishedPercent:row.published_percent,status:row.result_status,districtNumber:district?.district,
    districtTested:district?.tested,districtProficient:district?.proficient};
  const group=bySchool.get(row.dbn)??[];
  group.push(r);bySchool.set(row.dbn,group);
}
const mime:Record<string,string>={'.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml',
  '.png':'image/png','.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2','.ico':'image/x-icon'};
function listen(port:number,before:boolean){
  createServer(async(req,res)=>{
    res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
    res.setHeader('Cache-Control','no-store');
    if(req.method!=='GET'){res.writeHead(405).end();return;}
    function json(value:unknown,status=200){
      res.writeHead(status,{'Content-Type':'application/json'}).end(JSON.stringify(value));
    }
    try{
      const {pathname}=new URL(req.url||'/','http://localhost');
      if(pathname==='/api/schools') return json(schools);
      const match=/^\/api\/schools\/([\dA-Z]{6})(?:\/([^/]+))?$/.exec(pathname);
      if(match){
        const [,dbn,section]=match;
        if(!schoolMap.has(dbn)) return json({message:'School not found'},404);
        if(!section) return json(schoolMap.get(dbn));
        if(section==='nysed-assessments') return json(buildNysedProfileAssessments(before?[]:bySchool.get(dbn)??[]));
        if(section==='history') return json({direction:'insufficient_data',changePercent:0,yearsAnalyzed:0,historicalData:[]});
        if(section==='research-data') return json({},404);
        if(section==='zone') return json(null);
        return json([]);
      }
      if(pathname.startsWith('/api/')) return json({message:'Read-only public data preview'},401);
      if(pathname==='/robots.txt') return res.end('User-agent: *\nDisallow: /\n');
      if(/^\/school\/[\da-z][^/]+$/.test(pathname)) {
        return res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'}).end(index);
      }
      const asset=resolve(root,'.'+decodeURIComponent(pathname));
      if(!asset.startsWith(root+sep)) return res.writeHead(404).end();
      try{const body=await readFile(asset);return res.writeHead(200,{'Content-Type':mime[extname(asset)]||'application/octet-stream'}).end(body);}
      catch{return res.writeHead(404).end();}
    }catch(error){console.error(error);return res.writeHead(500).end('Preview error');}
  }).listen(port,'127.0.0.1',()=>console.log(`NYSED ${before?'before':'after'} fixture: http://127.0.0.1:${port}`));
}
listen(8801,true);
listen(8802,false);
