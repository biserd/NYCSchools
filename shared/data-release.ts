/** Small metadata only: safe for homepage and blog discovery bundles. */
export const DATA_RELEASE = {
  slug:'nyc-school-ratings-2026-data-release',
  path:'/blog/nyc-school-ratings-2026-data-release',
  title:'2026 NYC School Analysis: ELA Proficiency Fell at 720 of 843 Matched Schools',
  description:'ELA proficiency fell at 720 of 843 matched NYC schools from spring 2025 to 2026. Explore school examples, math and Regents findings, charts and public data.',
  publishedAt:'2026-11-07', updatedAt:'2026-11-07',
  contact:'hello@nycschoolsratings.com',
  resourceRoot:'/press/2026-school-results',
};
export const DATA_RELEASE_RESOURCES = [
  {id:'media_kit',file:'nyc-school-results-2026-media-kit.zip',label:'Download the media kit (ZIP)',detail:'Press release, three CSV files, methodology, source hashes and export manifest.'},
  {id:'assessment_csv',file:'ela-math-school-changes-2025-2026.csv',label:'ELA and math comparisons (CSV)',detail:'1,604 school-subject pairs, spring 2025 → spring 2026; 843 ELA and 761 math.'},
  {id:'regents_changes_csv',file:'regents-history-changes-2025-2026.csv',label:'Regents history comparisons (CSV)',detail:'605 school-exam pairs in Global History and US History, kept separate.'},
  {id:'regents_snapshot_csv',file:'regents-source-category-snapshots-2026.csv',label:'Regents source-category snapshots (CSV)',detail:'1,594 reporting-year 2026 records; exact source exam labels and comparability limits.'},
  {id:'release_text',file:'press-release.txt',label:'Press release (plain text)',detail:'Copy-ready announcement with findings, source scope and media contact.'},
  {id:'methodology',file:'README.txt',label:'Methodology and reuse notes',detail:'Eligibility, year labels, units, attribution and publication limits.'},
];
export const dataReleaseResourcePath=(file:string)=>`${DATA_RELEASE.resourceRoot}/${file}`;
export function dataReleaseSchema() {
  const origin='https://nycschoolsratings.com';
  return [{'@context':'https://schema.org','@type':'NewsArticle',headline:DATA_RELEASE.title,description:DATA_RELEASE.description,datePublished:DATA_RELEASE.publishedAt,dateModified:DATA_RELEASE.updatedAt,url:origin+DATA_RELEASE.path,mainEntityOfPage:origin+DATA_RELEASE.path,author:{'@type':'Organization',name:'NYC School Ratings'},publisher:{'@type':'Organization',name:'NYC School Ratings',logo:{'@type':'ImageObject',url:origin+'/favicon.png'}},citation:'https://infohub.nyced.org/reports/academics/test-results'},
    {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:origin},{'@type':'ListItem',position:2,name:'Blog',item:origin+'/blog'},{'@type':'ListItem',position:3,name:DATA_RELEASE.title,item:origin+DATA_RELEASE.path}]}];
}
