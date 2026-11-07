import {scoreMoverData as data} from './generated/score-movers-2026';
import {DATA_RELEASE} from './data-release';
const ela=data.assessments.ela,math=data.assessments.math;
export const releaseSummary = 'The public release includes 1,604 matched ELA/math school-subject comparisons and 605 Regents history school-exam comparisons, with clear years, tested counts and CSV downloads for families and reporters.';
export const releaseLead = 'NEW YORK — November 7, 2026 — NYC School Ratings has published a public school-by-school analysis of spring 2026 English Language Arts and math results and reporting-year 2026 Regents results, together with downloadable data for families, journalists and researchers.';
export const releaseFindings = [
  `ELA: ${ela.eligible} schools meet the analysis rules for spring 2025 and spring 2026. ${ela.increased} recorded an increase, ${ela.decreased} a decline and ${ela.unchanged} no change at one-decimal precision. The median school change was ${ela.medianChange?.toFixed(1)} percentage points.`,
  `Math: ${math.eligible} schools meet the rules in a separate matched sample. ${math.increased} recorded an increase, ${math.decreased} a decline and ${math.unchanged} no change at one-decimal precision. The median school change was ${math.medianChange?.toFixed(1)} percentage points.`,
  `Regents: ${data.regents['global-history'].eligible+data.regents['us-history'].eligible} school-exam comparisons cleared the checks for Global History and Geography (${data.regents['global-history'].eligible}) and US History and Government (${data.regents['us-history'].eligible}). The subjects are reported separately; there is no combined all-exam high-school growth ranking.`,
];
export const releaseSections = [
  {title:'What families can explore',paragraphs:[
    'The public guides show the largest eligible increases and decreases, both years’ results, tested counts, charts and links to school profiles. Families can use current proficiency alongside historical trends, demographics, programs and school comparisons when building a shortlist.',
    'The analysis and media downloads are available without an email signup. The downloadable CSVs include all eligible comparisons, rather than only the schools featured in the articles. A large increase does not automatically make a school the best fit, and a decline does not establish poorer teaching.'
  ]},
  {title:'How the comparisons were screened',paragraphs:[
    'ELA and math comparisons use the same school DBN and All Students population in spring 2025 (2024–25 school year) and spring 2026 (2025–26 school year). Both years must have at least 50 tested students, and the tested count must remain between 75% and 125% of its prior-year value. Matching tested-grade sets and grade-mix checks provide additional safeguards. A stricter 100-tested sensitivity analysis is available in the subject articles.',
    'These are descriptive school-level results from separate filtered samples, not official student-weighted citywide proficiency changes. They do not follow the same children across years or establish the cause of a change. The school-level ELA/math files exclude charter schools and District 75. The Children’s School is excluded because the source documents changed DBN attribution.',
    'The ELA/math source snapshot is dated August 3, 2026 and may differ from finalized NYSED results. This announcement publishes an independent analysis of already-public NYCPS files; it is not a new government data release. Rates in the published exports were reconciled with source percentages and tested counts using an independent workbook reader.'
  ]},
  {title:'Regents exam-version limits remain visible',paragraphs:[
    'English and algebra articles provide clearly labeled 2026 snapshots under the exact NYCPS source categories. They do not publish unvalidated growth leaderboards: the English exam transition and unresolved legacy algebra labels prevent a defensible same-version comparison in the available file. New science exams are not merged with predecessor exams.',
    'Regents Year is retained as a reporting year. The source reports each student’s highest numeric score per exam across administrations in that school year. Tested students, retakers and course-taking patterns can differ between years.'
  ]},
  {title:'Data, attribution and media access',paragraphs:[
    'The media kit contains this release, three CSV exports, methodology, source URLs and SHA-256 hashes. It distinguishes proficiency percentages, percentage-point changes, mean exam scores and tested-student counts. Earlier school-profile data remains available as history.',
    'Please credit NYC School Ratings for the independent analysis and NYC Public Schools for the source data, with a link to the analysis and methodology. Original source material retains its applicable terms. Media questions and corrections can be sent to hello@nycschoolsratings.com.'
  ]},
  {title:'About NYC School Ratings',paragraphs:[
    'NYC School Ratings is an independent website helping families explore New York City schools using public data, school profiles and comparison tools. Its analyses are not official NYCPS rankings or admissions predictions.'
  ]},
];
export function pressReleaseText() {
  return ['FOR IMMEDIATE RELEASE',DATA_RELEASE.title,releaseSummary,releaseLead,'Key findings from the matched samples',...releaseFindings,...releaseSections.flatMap(s=>[s.title,...s.paragraphs]),'Explore the results: https://nycschoolsratings.com/blog/nys-test-results-2026','Media kit and data: https://nycschoolsratings.com'+DATA_RELEASE.path+'#media-resources','Official source: https://infohub.nyced.org/reports/academics/test-results','Media contact: '+DATA_RELEASE.contact].join('\n\n')+'\n';
}
