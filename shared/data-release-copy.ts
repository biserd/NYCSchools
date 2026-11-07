import {scoreMoverData as data} from './generated/score-movers-2026';
import {DATA_RELEASE} from './data-release';

const ela=data.assessments.ela,math=data.assessments.math;
const globalHistory=data.regents['global-history'],usHistory=data.regents['us-history'];
const newHeights=ela.gains.find(s=>s.dbn==='17K722')!;
const ps380=math.gains.find(s=>s.dbn==='14K380')!;
const eagleAcademy=usHistory.gains.find(s=>s.dbn==='29Q327')!;
const pct=(value:number)=>value.toFixed(1)+'%';

export const releaseSummary = `The median ELA change was ${ela.medianChange?.toFixed(1)} percentage points, compared with ${math.medianChange?.toFixed(1)} in math. US History Regents pass rates rose at ${usHistory.increased} of ${usHistory.eligible} matched schools. All figures describe eligible school-level samples.`;
export const releaseLead = `NEW YORK, November 7, 2026. Lower English Language Arts proficiency was widespread among schools that qualified for NYC School Ratings' spring 2025 to spring 2026 comparison: ${ela.decreased} of ${ela.eligible} recorded declines. Math results were more evenly split, with ${math.increased} schools improving and ${math.decreased} declining in a separate sample. The independent analysis of already-public NYC Public Schools files shows why families should check the subject, year and tested group before interpreting a school's change.`;
export const releaseFindingsTitle = 'Reading, math and Regents results moved in different directions';
export const releaseFindings = [
  `ELA, spring 2025 to spring 2026: ${ela.decreased} of ${ela.eligible} eligible schools recorded lower proficiency, ${ela.increased} improved and ${ela.unchanged} were unchanged at one-decimal precision. The median school change was ${ela.medianChange?.toFixed(1)} percentage points.`,
  `Math, spring 2025 to spring 2026: ${math.increased} of ${math.eligible} eligible schools improved, ${math.decreased} declined and ${math.unchanged} were unchanged. The median school change was ${math.medianChange?.toFixed(1)} percentage points, much closer to zero than in the ELA sample.`,
  `US History and Government Regents, reporting year 2025 to 2026: pass rates at the 65+ threshold rose at ${usHistory.increased} of ${usHistory.eligible} matched schools and fell at ${usHistory.decreased}; ${usHistory.unchanged} were unchanged. The median change was +${usHistory.medianChange?.toFixed(1)} percentage points.`,
  `Global History and Geography Regents, reporting year 2025 to 2026: ${globalHistory.increased} of ${globalHistory.eligible} matched schools improved, ${globalHistory.decreased} declined and ${globalHistory.unchanged} were unchanged. The median change was ${globalHistory.medianChange?.toFixed(1)} percentage points. Combining these exams into one growth ranking would hide their different results.`,
];
export const releaseSections = [
  {title:'Three schools show what the changes look like',paragraphs:[
    `In Brooklyn, New Heights Middle School's ELA proficiency rose from ${pct(newHeights.previous)} in spring 2025 to ${pct(newHeights.current)} in spring 2026, a gain of ${newHeights.change.toFixed(1)} percentage points. The tested group numbered ${newHeights.previousTested} students in 2025 and ${newHeights.currentTested} in 2026. Its gain stood out against the declines across most schools in the eligible ELA sample.`,
    `Also in Brooklyn, P.S. 380 John Wayne Elementary's math proficiency rose from ${pct(ps380.previous)} to ${pct(ps380.current)}, a gain of ${ps380.change.toFixed(1)} percentage points between spring 2025 and spring 2026. Tested counts were ${ps380.previousTested} and ${ps380.currentTested}, respectively.`,
    `In Queens, Eagle Academy for Young Men III's US History and Government Regents pass rate at the 65+ threshold rose from ${pct(eagleAcademy.previous)} in reporting year 2025 to ${pct(eagleAcademy.current)} in 2026, a gain of ${eagleAcademy.change.toFixed(1)} percentage points. The source reports ${eagleAcademy.previousTested} tested students in each year. These examples describe different tested groups across years; they do not measure the progress of the same children or establish what caused the changes.`,
  ]},
  {title:'What parents can check before choosing a school',paragraphs:[
    'A rise in proficiency and a high current proficiency rate answer different questions. Families can open the ELA and math guides to see both years, the size of the tested group and the largest eligible gains and declines, then visit school profiles to put those results alongside enrollment history, demographics and programs.',
    'For high schools, check the exam name as well as the year. The Regents guides publish separate Global History and US History comparisons. English and algebra appear as labeled 2026 snapshots because the available source does not establish a valid exam-version match for growth rankings. New science exams are not merged with predecessor exams.',
    'The analysis and media downloads are available without an email signup. The files contain all 1,604 eligible ELA/math school-subject comparisons and all 605 eligible Regents history school-exam comparisons, not just the featured schools. Those totals count comparisons, not unique schools.',
  ]},
  {title:'Which schools qualified, and what the figures cannot tell us',paragraphs:[
    'ELA and math use the same school DBN and All Students population in spring 2025 (2024–25 school year) and spring 2026 (2025–26 school year). Both years must have at least 50 tested students, and the current tested count must stay between 75% and 125% of the prior count. Matching tested-grade sets and grade-mix checks provide additional safeguards. The subject articles also show a stricter 100-tested sensitivity analysis.',
    'These are separate filtered samples of school-level results, not official student-weighted citywide proficiency changes. They do not follow the same children across years, establish teaching effects or rank overall school quality. Charter schools and District 75 are outside the ELA/math school-file scope. The Children’s School is excluded because source DBN attribution changed.',
    'The ELA/math source snapshot is dated August 3, 2026 and may differ from finalized NYSED results. This is independent analysis of already-public NYCPS files, not a new government data release. Exported rates were reconciled with source percentages and tested counts using an independent workbook reader.',
    'Regents Year is a reporting year. The source reports each student’s highest numeric score per exam across administrations in that school year. Retakers, course-taking patterns and tested groups can differ between years. The 65+ pass-rate threshold is distinct from mean scores and the share scoring 80+.',
  ]},
  {title:'For reporters covering a borough or a particular school',paragraphs:[
    'The public media kit includes this release, the full comparison CSVs, separate Regents snapshots, methodology and original source links. School identifiers and borough fields let reporters check a local school or build a borough-specific story. Every comparison retains its years and tested counts; charts and school profiles provide additional context.',
    'Please credit NYC School Ratings for the independent analysis and NYC Public Schools for the source data, with a link to the analysis and methodology. Original source material retains its applicable terms. For data questions or corrections, contact hello@nycschoolsratings.com.',
  ]},
  {title:'About NYC School Ratings',paragraphs:[
    'NYC School Ratings is an independent website helping families explore New York City schools using public data, school profiles and comparison tools. Its analyses are not official NYCPS rankings or admissions predictions.',
  ]},
];
export function pressReleaseText() {
  return ['FOR IMMEDIATE RELEASE',DATA_RELEASE.title,releaseSummary,releaseLead,releaseFindingsTitle,...releaseFindings,...releaseSections.flatMap(s=>[s.title,...s.paragraphs]),'Explore the results: https://nycschoolsratings.com/blog/nys-test-results-2026','Media kit and data: https://nycschoolsratings.com'+DATA_RELEASE.path+'#media-resources','Official source: https://infohub.nyced.org/reports/academics/test-results','Media contact: '+DATA_RELEASE.contact].join('\n\n')+'\n';
}
