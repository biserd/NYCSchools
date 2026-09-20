import {mkdir,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {booleanPointInPolygon} from '@turf/boolean-point-in-polygon';
import {point} from '@turf/helpers';
import type {Feature,FeatureCollection,MultiPolygon,Polygon} from 'geojson';

const SOURCE='https://data.cityofnewyork.us/resource/9nt8-h7nd.geojson?$limit=500';
const targets={
  staging:{database:'nyc-schools-ratings-d1-staging',databaseId:'e48a9ae9-4948-4dae-863a-06f6b026b436',config:'wrangler.d1-staging.jsonc',base:'https://nyc-schools-ratings-d1-staging.biser-d.workers.dev'},
  production:{database:'nyc-schools-ratings-production',databaseId:'35237f81-df27-4908-be1a-1226faf501e0',config:'wrangler.jsonc',base:'https://nycschoolsratings.com'},
} as const;
const targetName=process.argv[process.argv.indexOf('--target')+1] as keyof typeof targets;
const target=targets[targetName];
const expected=process.argv[process.argv.indexOf('--expected-database')+1];
if(!target||expected!==target.databaseId)throw new Error('Use --target staging|production with that target\'s exact --expected-database ID.');
if(targetName==='production'&&!process.argv.includes('--apply'))throw new Error('Production geography import must be explicitly applied; dry-run against staging first.');

type NtaProps={nta2020:string;ntaname:string;boroname:string;ntatype:string};
type SchoolPoint={dbn:string;latitude:number|null;longitude:number|null};
const response=await fetch(SOURCE);if(!response.ok)throw new Error(`Official NTA source failed: ${response.status}`);
const collection=await response.json() as FeatureCollection<Polygon|MultiPolygon,NtaProps>;
const neighborhoods=collection.features.filter(f=>f.properties.ntatype==='0'&&/^[A-Z]{2}\d{4}$/.test(f.properties.nta2020));
if(neighborhoods.length<190)throw new Error(`Incomplete official NTA source: ${neighborhoods.length}`);
const schoolResponse=await fetch(`${target.base}/api/schools`);if(!schoolResponse.ok)throw new Error(`School directory failed: ${schoolResponse.status}`);
const schools=await schoolResponse.json() as SchoolPoint[];
if(schools.length<1000)throw new Error(`Incomplete school directory: ${schools.length}`);

const normalized=(value:string)=>value.toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const aliases=(name:string)=>{
  const values=new Set([normalized(name)]),withoutParenthetical=name.replace(/\s*\([^)]*\)\s*/g,' ').trim();
  values.add(normalized(withoutParenthetical));
  for(const part of withoutParenthetical.split(/\s+-\s+|-/).map(v=>normalized(v)))if(part.length>=4&&!['north','south','east','west','central'].includes(part))values.add(part);
  return values;
};
const curated:Record<string,string[]>={
  ues:['upper east side'],uws:['upper west side'],les:['lower east side'],lic:['long island city'],fidi:['financial district'],
  'bed stuy':['bedford stuyvesant'],'wash heights':['washington heights'],'prospect lefferts':['prospect lefferts gardens'],
};
const literal=(value:unknown)=>value==null?'NULL':typeof value==='number'?String(value):`'${String(value).replaceAll("'","''")}'`;
const now=Date.now(),statements=['DELETE FROM school_neighborhoods;','DELETE FROM nyc_neighborhood_aliases;','DELETE FROM nyc_neighborhoods;'];
for(const feature of neighborhoods){
  const p=feature.properties;statements.push(`INSERT INTO nyc_neighborhoods(nta_code,name,borough,source_url,imported_at) VALUES(${[p.nta2020,p.ntaname,p.boroname,SOURCE,now].map(literal)});`);
  for(const alias of aliases(p.ntaname))statements.push(`INSERT OR IGNORE INTO nyc_neighborhood_aliases(alias,nta_code) VALUES(${literal(alias)},${literal(p.nta2020)});`);
}
for(const [alias,needles] of Object.entries(curated))for(const feature of neighborhoods)if(needles.some(needle=>normalized(feature.properties.ntaname).includes(needle)))statements.push(`INSERT OR IGNORE INTO nyc_neighborhood_aliases(alias,nta_code) VALUES(${literal(alias)},${literal(feature.properties.nta2020)});`);
let matched=0;
for(const school of schools){
  if(!Number.isFinite(school.latitude)||!Number.isFinite(school.longitude))continue;
  const schoolPoint=point([school.longitude!,school.latitude!]);
  const feature=neighborhoods.find(candidate=>booleanPointInPolygon(schoolPoint,candidate as Feature<Polygon|MultiPolygon>));
  if(feature){matched++;statements.push(`INSERT INTO school_neighborhoods(school_dbn,nta_code,matched_at) VALUES(${literal(school.dbn)},${literal(feature.properties.nta2020)},${now});`);}
}
if(matched<1000)throw new Error(`Too few schools matched to official NTAs: ${matched}`);
await mkdir('.wrangler',{recursive:true});const file=`.wrangler/parent-geography-${targetName}.sql`;await writeFile(file,statements.join('\n'));
console.log(`Validated ${neighborhoods.length} official residential NTAs and ${matched}/${schools.length} geocoded schools. SQL: ${file}`);
if(process.argv.includes('--apply')){
  const output=await new Promise<string>((resolve,reject)=>{const child=spawn(process.execPath,['node_modules/wrangler/bin/wrangler.js','d1','execute',target.database,'--remote','--config',target.config,'--file',file,'--yes'],{windowsHide:true});let stdout='',stderr='';child.stdout.on('data',c=>stdout+=c);child.stderr.on('data',c=>stderr+=c);child.on('error',reject);child.on('close',code=>code===0?resolve(stdout):reject(new Error(stderr||stdout)));});
  console.log(output);
} else console.log('Dry run complete. Add --apply after review.');
