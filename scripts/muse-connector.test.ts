import assert from 'node:assert/strict';
import { museCompareSchema, museComparison, museDetailSchema, museSchoolProfile, searchMuseSchools } from '../server/museResearch';
import type { School } from '../shared/schema';
import type { SurveyResult } from '../shared/surveys';

const base='https://nycschoolsratings.com';
const makeSchool=(overrides:Partial<School>):School=>({
  dbn:'02M545',name:'Sample School',district:2,address:'100 Main Street, Manhattan NY',grade_band:'K-5',borough:'Manhattan',
  academics_score:80,climate_score:70,progress_score:75,ela_proficiency:60,math_proficiency:55,science_proficiency:null,
  has_2k:false,has_3k:false,has_prek:false,has_gifted_talented:false,has_dual_language:false,
  assessment_year:'2024-25',assessment_source:'NYSED',last_updated:new Date('2026-09-01T00:00:00Z'),
  ...overrides,
} as School);

const schools=[
  makeSchool({dbn:'02M545',name:'P.S. 15 Sample',has_dual_language:true}),
  makeSchool({dbn:'02M546',name:'PS 15 Sample Annex',has_gifted_talented:true}),
  makeSchool({dbn:'84K100',name:'Brooklyn Charter',district:19,borough:null,grade_band:'K-8'}),
  makeSchool({dbn:'06F014',name:'Two-K Center',district:6,grade_band:'2K',has_2k:true,has_3k:true,has_prek:true,
    academics_score:null,climate_score:null,progress_score:null,ela_proficiency:null,math_proficiency:null,
    assessment_year:null,early_childhood_source:{sourceUrl:'https://www.myschools.nyc/en/schools/2-k/',processId:48,cycle:'2025-26 School Year',verifiedAt:'2026-09-13',status:'verified',legacyCenterCode:'ABCD12'}}),
  makeSchool({dbn:'06F015',name:'Unverified Two-K',district:6,grade_band:'2K',has_2k:true,
    early_childhood_source:{sourceUrl:'https://www.myschools.nyc/en/schools/2-k/',processId:48,cycle:'2025-26 School Year',verifiedAt:null,status:'needs_verification'}}),
];

const byName=searchMuseSchools(schools,{query:'PS 15',limit:1},base);
assert.equal(byName.total_matches,2,'ambiguous names must remain separate canonical schools');
assert.equal(byName.schools.length,1);
assert.equal(byName.next_offset,1);
assert.equal(searchMuseSchools(schools,{query:'PS 15',limit:1,offset:1},base).schools[0].dbn,'02M546');
assert.equal(searchMuseSchools(schools,{borough:'Brooklyn',school_type:'charter',grade:'7'},base).schools[0].dbn,'84K100');
assert.equal(searchMuseSchools(schools,{borough:'Brooklyn',school_type:'charter',grade:'7'},base).schools[0].borough,'Brooklyn');
assert.equal(searchMuseSchools(schools,{district:19,school_type:'charter'},base).schools[0].school_type,'charter');
assert.equal(searchMuseSchools(schools,{district:2,has_dual_language:true},base).schools[0].dbn,'02M545');
assert.deepEqual(searchMuseSchools(schools,{has_2k:true},base).schools.map(s=>s.dbn),['06F014']);
assert.deepEqual(searchMuseSchools(schools,{grade:'2k'},base).schools.map(s=>s.dbn),['06F014']);
assert.equal(searchMuseSchools(schools,{has_3k:true,has_prek:true},base).schools[0].dbn,'06F014');
assert.throws(()=>searchMuseSchools(schools,{limit:21},base));
assert.throws(()=>searchMuseSchools(schools,{offset:-1},base));
assert.throws(()=>searchMuseSchools(schools,{unknown:'value'},base));
assert.throws(()=>museDetailSchema.parse({dbn:'bad id'}));
assert.throws(()=>museCompareSchema.parse({dbns:['02M545','02M545']}));
assert.throws(()=>museCompareSchema.parse({dbns:['02M545']}));

const birthToFive:SurveyResult={year:2026,instrument:'b5-family',sourceId:'ABCD12',sourceName:'Center',sourceUrl:'https://infohub.nyced.org/reports/students-and-schools/school-quality/nyc-school-survey',sourceHash:'hash',importedAt:'2026-09-01T00:00:00Z',responseCount:8,responseRate:null,
  metrics:[{key:'trust',label:'Trust',value:null,status:'not_reported'}]};
const early=museSchoolProfile(schools[3],[birthToFive],base);
assert.equal(early.rating.overall_score,null,'early-childhood provider is not K–12 academically rated');
assert.equal(early.academics.ela_proficiency,null);
assert.equal(early.surveys[0].scope,'center_wide');
assert.equal(early.surveys[0].metrics[0].value,null,'missing survey must remain null');
assert.match(early.surveys[0].note,/not results for a specific 2-K/);
assert.match(early.programs.source_cycle_note || '',/raw provenance/);

const comparison=museComparison([schools[0],schools[3]],{'06F014':[birthToFive]},base);
assert.equal(comparison.schools[0].rating.overall_score,museSchoolProfile(schools[0],[],base).rating.overall_score);
assert.equal(comparison.schools[1].rating.overall_score,null);
assert.equal(comparison.schools[1].surveys[0].scope,'center_wide');
assert.ok(comparison.schools.every(s=>s.canonical_url.startsWith(`${base}/school/`)));
console.log('Muse connector pure-contract tests passed');
