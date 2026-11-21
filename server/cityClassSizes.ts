import type { Express } from 'express';
import { readClassroomD1, type PilotRead } from './classroomPilot';
import type { ClassSizeCaps, ClassSizeRow, CityClassSizeProfile } from '../shared/city-class-size';
import { requireSchoolResearchAccess } from './schoolResearchAccess';

export function cityClassSizesEnabled(){
  return ['staging','production'].includes(process.env.ENVIRONMENT??'')&&process.env.CITY_CLASS_SIZES_ENABLED==='true';
}

const fallReleaseScope=`FROM city_class_size_releases r WHERE observed_on LIKE '%-10-31'
    AND revision=(SELECT max(r2.revision) FROM city_class_size_releases r2 WHERE r2.observed_on=r.observed_on)
    ORDER BY observed_on DESC`;

const fallReleases=(read:PilotRead)=>read<{id:string; observedOn:string; releaseLabel:string}>(
  `SELECT id,observed_on AS observedOn,release_label AS releaseLabel ${fallReleaseScope} LIMIT 2`);

export async function hasCityClassSizes(dbn:string,read:PilotRead=readClassroomD1) {
  const rows=await read<{found:number}>(`SELECT 1 AS found FROM city_class_size_sections s
    WHERE s.scope='school' AND s.scope_id=? AND s.release_id=(SELECT id ${fallReleaseScope} LIMIT 1)
    AND EXISTS (SELECT 1 FROM schools WHERE dbn=s.scope_id) LIMIT 1`,[dbn]);
  return rows.length>0;
}

export async function loadCityClassSizes(dbn:string,read:PilotRead=readClassroomD1):Promise<CityClassSizeProfile|null>{
  const [latest,previous]=await fallReleases(read);
  if(!latest) return null;
  const [school]=await read<{district:number|null}>(`SELECT CASE WHEN district BETWEEN 1 AND 32 AND district=CAST(substr(dbn,1,2) AS INTEGER) THEN district END AS district
    FROM schools WHERE dbn=?`,[dbn]);
  if(!school) return null;
  const district=school.district==null?'':String(school.district).padStart(2,'0');
  const rows=await read<ClassSizeRow>(`SELECT s.band,s.group_name AS groupName,s.department,s.program,s.students,s.classes,s.minimum,s.maximum,
      d.students AS districtStudents,d.classes AS districtClasses,p.students AS previousStudents,p.classes AS previousClasses
    FROM city_class_size_sections s
    LEFT JOIN city_class_size_sections d ON d.scope='district' AND d.scope_id=? AND d.release_id=s.release_id
      AND d.band=s.band AND d.group_name=s.group_name AND d.department=s.department AND d.program=s.program AND d.benchmark_verified=1
    LEFT JOIN city_class_size_sections p ON s.band='K5' AND p.scope='school' AND p.scope_id=s.scope_id AND p.release_id=?
      AND p.band=s.band AND p.group_name=s.group_name AND p.department=s.department AND p.program=s.program
    WHERE s.scope='school' AND s.scope_id=? AND s.release_id=? ORDER BY s.band,s.group_name,s.department,s.program`,
    [district,previous?.id??'',dbn,latest.id]);
  if(!rows.length) return null;
  const caps=await read<ClassSizeCaps>(`SELECT scope,group_name AS groupName,eligible,meeting FROM city_class_size_caps WHERE dbn=? AND release_id=?`,[dbn,latest.id]);
  return {observedOn:latest.observedOn,previousOn:previous?.observedOn??null,releaseLabel:latest.releaseLabel,district:school.district,rows,caps};
}

export async function loadDistrictClassSizes(district:number,read:PilotRead=readClassroomD1):Promise<CityClassSizeProfile|null>{
  const [latest,previous]=await fallReleases(read);
  if(!latest)return null;
  const rows=await read<ClassSizeRow>(`SELECT s.band,s.group_name AS groupName,s.department,s.program,s.students,s.classes,s.minimum,s.maximum,
      NULL AS districtStudents,NULL AS districtClasses,p.students AS previousStudents,p.classes AS previousClasses
    FROM city_class_size_sections s
    LEFT JOIN city_class_size_sections p ON p.scope='district' AND p.scope_id=s.scope_id AND p.release_id=?
      AND p.band=s.band AND p.group_name=s.group_name AND p.department=s.department AND p.program=s.program AND p.benchmark_verified=1
    WHERE s.scope='district' AND s.scope_id=? AND s.release_id=? AND s.band='K5' AND s.benchmark_verified=1
    ORDER BY s.group_name,s.program`,[previous?.id??'',String(district).padStart(2,'0'),latest.id]);
  return rows.length?{observedOn:latest.observedOn,previousOn:previous?.observedOn??null,releaseLabel:latest.releaseLabel,district,rows,caps:[]}:null;
}

export function registerCityClassSizeRoutes(app:Express){
  app.get('/api/schools/:dbn/class-sizes',requireSchoolResearchAccess,async(req,res)=>{
    if(!cityClassSizesEnabled())return res.json(null);
    const dbn=String(req.params.dbn).toUpperCase();
    if(!/^\d{2}[A-Z]\d{3}$/.test(dbn))return res.status(400).json({message:'Invalid school code'});
    try{
      return res.json(await loadCityClassSizes(dbn));
    }catch(error){
      console.error('[CITY_CLASS_SIZES]',error);
      return res.status(503).json({message:'Class size data temporarily unavailable'});
    }
  });
  app.get('/api/districts/:district/class-sizes',async(req,res)=>{
    if(!cityClassSizesEnabled())return res.json(null);
    const district=Number(req.params.district);
    if(!Number.isInteger(district)||district<1||district>32)return res.status(400).json({message:'Invalid geographic district'});
    try{
      return res.set('Cache-Control','public, max-age=300').json(await loadDistrictClassSizes(district));
    }catch(error){
      console.error('[CITY_CLASS_SIZES_DISTRICT]',error);
      return res.status(503).json({message:'Class size data temporarily unavailable'});
    }
  });
}
