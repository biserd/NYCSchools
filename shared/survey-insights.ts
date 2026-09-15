import { SURVEY_CITYWIDE, SURVEY_GUIDE, SURVEY_SOURCE } from './surveys';
export type SurveyInsight = { slug: string; title: string; description: string; sections: { title: string; text: string }[]; table?: { caption: string; headers: string[]; rows: string[][] }; source: string };
export function surveyBlogSchema(page: SurveyInsight) {
  const origin='https://nycschoolsratings.com', url=`${origin}/blog/${page.slug}`;
  return [
    {'@context':'https://schema.org','@type':'Article',headline:page.title,description:page.description,url,datePublished:'2026-09-15',articleSection:'Data Analysis',author:{'@type':'Organization',name:'NYC School Ratings Team'},citation:page.source},
    {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:'Home',item:origin},{'@type':'ListItem',position:2,name:'Blog',item:`${origin}/blog`},{'@type':'ListItem',position:3,name:page.title,item:url}]},
  ];
}
export const SURVEY_INSIGHTS: SurveyInsight[] = [
  {slug:'nys-test-results-2026',title:'2026 New York state test results: preliminary release and next update',
    description:'What the preliminary 2026 ELA, math and science release means, and why final school-level results are not yet used in NYC School Ratings.',
    source:'https://www.nysed.gov/news/2026/state-education-department-releases-preliminary-data-english-language-arts-mathematics-and',
    sections:[
      {title:'Preliminary results are under review',text:'NYSED announced on August 5, 2026 that preliminary ELA, mathematics and science results were available to schools and districts for verification. The announcement anticipated the public release of final state assessment data in early November.'},
      {title:'What appears on school profiles now',text:'We have not imported preliminary 2026 school-level assessment results. Existing assessment figures retain their own reporting years. Statewide charts cannot supply a missing school result, and survey feedback is not a substitute for an assessment.'},
      {title:'How the next update will be checked',text:'Before adding final results, we will verify school identifiers, reporting year, grade and subject, participation and suppression rules. We will preserve earlier results so families can distinguish a genuine year-to-year change from a coverage or methodology change.'},
    ]},
  { slug: 'nyc-school-survey-2026', title: '2026 NYC School Survey: results and what they mean for families',
    description: 'Explore NYC family, teacher, student and early-childhood survey results, with participation context and links to individual school feedback.', source: SURVEY_CITYWIDE,
    sections: [
      {title:'A broader view of school experience',text:'The official citywide report records 871,154 respondents: 446,743 families, 357,845 students and 66,566 teachers. These counts include NYCPS and charter responses, but exclude Birth-to-Five and support staff.'},
      {title:'Use each perspective separately',text:'Family feedback helps frame conversations about communication and trust. Student feedback adds a view of everyday learning and school climate. Teacher feedback addresses instruction, collaboration and leadership. Explore the separate guides below before comparing schools.'},
      {title:'A new student baseline',text:'The 2026 student instrument changed. Its results should not be compared with earlier years. Early-childhood feedback also has its own instrument and population.'},
      {title:'From citywide findings to your shortlist',text:'Use the school search to open a profile, then find “What the school community says.” Read the reporting year, respondent group and participation before drawing conclusions. Missing feedback is not a poor score.'},
    ] },
  { slug:'nyc-family-survey-2026',title:'2026 NYC family survey: participation and school experience',
    description:'See how family survey participation changed across NYC boroughs and how to use school-level feedback on education, communication and trust.',source:SURVEY_CITYWIDE,
    sections:[
      {title:'Participation grew in four boroughs',text:'The official report shows family response rates rising in Manhattan, the Bronx, Brooklyn and Queens, and falling in Staten Island. These borough figures use geographic districts and exclude District 75 and charters.'},
      {title:'What to look for on a school profile',text:'Start with satisfaction with education, outreach to parents and trust. Expand the results for family involvement, facilities and IEP service satisfaction where reported. These measures answer different questions, so a single combined score would hide useful detail.'},
      {title:'Turn feedback into questions for a school visit',text:'Ask how teachers share progress, how families raise concerns and what support is available when a child struggles. A high response rate gives broader participation context, but does not remove possible response bias.'},
    ],table:{caption:'Official family response rates by borough (not satisfaction scores)',headers:['Borough','2025','2026','Change'],rows:[['Manhattan','47%','50%','+3 pp'],['Bronx','53%','54%','+1 pp'],['Brooklyn','51%','53%','+2 pp'],['Queens','48%','52%','+4 pp'],['Staten Island','48%','46%','−2 pp']]} },
  {slug:'nyc-teacher-survey-2026',title:'2026 NYC teacher survey: teaching, collaboration and leadership',
    description:'Understand teacher survey feedback on instruction, professional development and leadership, and how to read it alongside family and student results.',source:SURVEY_SOURCE,
    sections:[
      {title:'Read the working conditions behind instruction',text:'Teacher survey topics include peer collaboration, instructional leadership and professional development. These provide context about the learning environment rather than direct evidence of test-score growth.'},
      {title:'Compare like with like',text:'Use the same reporting year, respondent group and topic. A teacher safety measure and a student safety measure reflect different perspectives; disagreement can be a useful question to explore rather than a calculation error.'},
      {title:'What this release does not establish',text:'We do not infer teacher retention, staffing quality or causal effects from a survey score. No school-level teacher trend is shown until prior-year questions, populations and calculations have been checked.'},
    ]},
  {slug:'nyc-student-survey-2026',title:'2026 NYC student survey: a new baseline for school experience',
    description:'Explore the new 2026 student survey baseline, including school safety feedback, and understand why previous-year comparisons are not valid.',source:SURVEY_CITYWIDE,
    sections:[
      {title:'Safety feedback differs by setting',text:'Official citywide favorable responses were 92% for classroom safety, 87% for hallways and cafeterias, and 84% for locker rooms and bathrooms. These are individual questions, not a school’s overall Safety topic score.'},
      {title:'Do not draw an improvement trend yet',text:'The redesigned student survey starts a new baseline in 2026. A difference from an older score cannot reliably show improvement or decline.'},
      {title:'Keep neighborhood safety separate',text:'Student feedback describes experience inside school. The neighborhood safety index uses police complaint data around a location. Neither is a substitute for the other. Ask schools how they support students in the specific settings that concern your family.'},
    ]},
  {slug:'nyc-early-childhood-survey-2026',title:'2026 NYC early-childhood survey: family and teacher feedback',
    description:'Understand Birth-to-5 survey feedback for NYC early-childhood centers, including what it can and cannot tell you about 2-K, 3-K and pre-K.',source:SURVEY_SOURCE,
    sections:[
      {title:'Feedback at the center level',text:'Birth-to-5 family and teacher files are separate from the K–12 files. A center may serve multiple ages. Its feedback must not be described as a result specifically from 2-K families unless the source identifies that cohort.'},
      {title:'Why some profiles have no results',text:'A source center code must match an existing official identifier before we attach feedback. We do not match by a similar name or shared address. Some reported rows contain no published topic scores. Neither missing scores nor an unmatched identifier establish anything about program quality.'},
      {title:'How parents can use it',text:'Look for feedback about relationships, communication and education. Ask how caregivers learn about their child’s day and how teachers adapt activities for different developmental stages. Check current programs independently: survey participation does not establish current availability or admissions priority.'},
    ]},
  {slug:'survey-methodology',title:'School survey methodology, sources and limitations',
    description:'How NYC School Ratings links official survey results to schools, preserves missing values and separates respondent groups, years and rating calculations.',source:SURVEY_GUIDE,
    sections:[
      {title:'Source and reporting period',text:'The 2026 NYC School Survey ran February 9–April 30, 2026. Profile results come from the official instrument-specific Excel summary sheets. Each result retains its original source identifier, download link, file hash, instrument and import date.'},
      {title:'What a topic score means',text:'The technical guide defines question favorability using valid responses and combines question percentages into a topic measure. We display the published summary value on its 0–100 scale without recalculating it. Response rates, when supplied, are shown separately from topic results.'},
      {title:'Matching and canonical records',text:'K–12 records match school DBNs. Birth-to-5 records match center location codes; an existing SEMS-to-DBN relationship links a center to its canonical school. Unmatched rows remain unassociated. We do not create duplicate schools or join on names or addresses.'},
      {title:'Missingness and participation',text:'Source N/A and blank scores stay “Not reported,” never zero. An overall response count is not the number answering every question. A low-count caution is shown below ten responses as a product warning, not an official suppression rule. Birth-to-5 summary files do not supply response rates.'},
      {title:'Comparisons and ratings',text:'The 2026 student survey is a new baseline. No prior-year student deltas are calculated. We do not compute a citywide respondent percentage by averaging school scores. The new survey layer does not change existing academic ratings or the neighborhood safety index.'},
      {title:'Coverage and corrections',text:'A profile shows only exactly matched source records. Different instruments can have different coverage. Questions and demographic breakdowns are not included in this initial profile release. Report a suspected mismatch through our contact page; include the school and source identifiers.'},
    ]},
];
export const getSurveyInsight = (slug: string) => SURVEY_INSIGHTS.find(p => p.slug === slug);
