import type { GuideLink, ParentGuide } from './parent-guides';
import { SURVEY_SOURCE } from './surveys';

const reviewedAt = '2026-11-14';
const admissions = 'https://www.schools.nyc.gov/enrollment/enroll-grade-by-grade';
const officialPreK = { label: 'NYCPS pre-K: settings, seat types and priorities', href: `${admissions}/pre-k` };
const officialK = { label: 'NYCPS kindergarten: programs, zones and priorities', href: `${admissions}/kindergarten` };
const surveys = { label: 'NYCPS 2026 Birth-to-5 family and teacher survey releases', href: SURVEY_SOURCE };
const enrollment = { label: 'NYCPS Demographic Snapshot: 2025–26 enrollment by grade', href: 'https://infohub.nyced.org/reports/students-and-schools/school-quality/information-and-data-overview' };
const preKApplication = { label: 'See the Fall 2027 3-K & Pre-K application guide', href: '/guides/nyc-3k-prek-applications-2027' };
const kindergartenApplication = { label: 'See the Fall 2027 kindergarten application guide', href: '/guides/nyc-kindergarten-admissions-2027' };
const preKSlug = 'best-nyc-pre-k-programs-2027';
const kindergartenSlug = 'best-nyc-kindergarten-schools-2027';
const card = (id: string): GuideLink => ({ label: 'Official MySchools pre-K listing', href: `https://www.myschools.nyc/en/schools/pre-k/${id}/` });
const school = (id: string): GuideLink => ({ label: 'NYCPS school profile', href: `https://www.schools.nyc.gov/schools/${id}` });

export const FALL_2027_SHORTLIST_GUIDES: ParentGuide[] = [
  {
    slug: preKSlug, kind: 'editorial', shortlistMode: 'pre-k', reviewedAt,
    title: 'Best NYC Pre-K Programs for Fall 2027: Compare by Borough',
    description: 'Compare up to two NYC pre-K options per district for fall 2027, with published enrollment and 2026 Birth-to-5 feedback where matched.',
    answer: 'The best pre-K for your family is one you can get to reliably, with hours that work and a classroom that supports your child. Pick a district to see one or two options to look into. These are examples, not confirmed openings for fall 2027.',
    verified: {
      heading: 'Five pre-K programs worth comparing by borough',
      caption: 'Illustrative shortlist, one program per borough. Listings were checked November 14, 2026. Hours and offerings are planning leads, not 2027 commitments. Survey counts and scores are from the 2026 release and describe the entire center.',
      firstColumn: 'Borough and program',
      columns: ['What the program lists', 'Worth checking if you need…'],
      rows: [
        { name: 'Manhattan · Lenox Hill Neighborhood House (02MAMQ)', dbKey: 'MAMQ', profile: '/early-childhood/mamq-lenox-hill-neighborhood-house', cells: ['331 East 70th St. MySchools lists School Day pre-K and language supports including Spanish.', 'Language support for your child or for parent communication. Ask what is available in the classroom, not just on the listing.'], sources: [card('02MAMQ')] },
        { name: 'Brooklyn · Imagine Early Learning Center at Brooklyn Heights (13KCEH)', dbKey: 'KCEH', profile: '/early-childhood/kceh-imagine-brooklyn-heights', cells: ['50 Monroe Place. MySchools lists School Day pre-K, 9:30 a.m.–3:50 p.m.', 'A later drop-off than many school-day listings. If you start work earlier, confirm what coverage is available before 9:30.'], sources: [card('13KCEH')] },
        { name: 'Bronx · P.S. 069 Journey Prep School (08X069)', profile: '/school/08x069-ps-069-journey-prep-school', cells: ['District 8 public elementary school. NYCPS lists both pre-K and kindergarten at the school.', 'A public-school setting with both age groups. Ask whether your preferred pre-K seat type is listed and what kindergarten priority would apply the following year.'], sources: [school('X069'), card('08X069')] },
        { name: 'Queens · Cross Island YMCA (26QAJX)', dbKey: 'QAJX', profile: '/early-childhood/qajx-ymca-of-greater-new-york-cross-island', cells: ['The provider describes free full-day Pre-K for All and optional early drop-off and after-school programming. Those add-ons are separate from the pre-K offer.', 'Coverage outside pre-K hours. Ask about separate registration, costs, and availability for the 2027–28 school year.'], sources: [card('26QAJX'), { label: 'Cross Island YMCA: pre-K and extended-hours options', href: 'https://ymcanyc.org/locations/cross-island-ymca/programs-classes/kids-family/child-care-preschool' }] },
        { name: 'Staten Island · Little Smarties Preschool (31RAEP)', cells: ['329 Norway Ave. MySchools lists School Day pre-K and Spanish language support.', 'A local School Day option with Spanish support. Confirm what the support includes and whether the pickup time works for your family.'], sources: [card('31RAEP')] },
      ],
      takeaway: 'Check the seat type and the full day first. A later School Day start and separately registered extended hours solve different problems. Use the survey feedback to decide what to ask on a visit, not to rank the centers.',
    },
    columns: ['Family need', 'Shortlist using', 'Question for the visit'],
    comparison: [
      ['A schedule you can sustain', 'Travel time at drop-off and pickup, School Day vs. Extended Day and Year vs. City Transitional', 'What hours are included? What requires separate registration, eligibility or fees?'],
      ['Language or accessibility support', 'The exact site and program listing; confirmed arrangements for your child', 'What does support look like during a typical day? Which entry, rooms and restrooms will my child use?'],
      ['A strong daily experience', 'Classroom visits and center-wide family feedback with response counts where available', 'How do teachers help a child settle in and communicate with caregivers?'],
    ],
    questions: [
      { title: 'Why the data differs by program', text: 'School-based programs in this guide have a published pre-K enrollment count. The featured community providers instead use center-wide survey data where we can verify the same official location code. A survey response count is not an enrollment count, so the charts keep those measures separate.' },
      { title: 'What the survey does and does not say', text: 'Outreach to Parents is an NYCPS topic score out of 100, not the percent of all enrolled families who agree. Published response counts are for the whole survey, not necessarily that question. Birth-to-5 summary files do not give response rates. Missing feedback is not zero. We do not use elementary ELA or math tests to score pre-K.' },
      { title: 'How to leave with three options to visit', text: 'Start with a nearby provider whose hours work. Add one with the support or setting that matters most to you, then add another program you would be comfortable accepting. Verify all three in MySchools before applying, including the exact seat type and current priorities. Showing a program here does not mean seats are open.' },
    ],
    sources: [officialPreK, { label: 'MySchools official pre-K directory', href: 'https://www.myschools.nyc/en/schools/pre-k/' }, enrollment, surveys],
    related: [
      { label: 'Browse NYC pre-K profiles by program', href: '/program/prek' },
      { label: 'Read our 2026 Birth-to-5 survey analysis', href: '/blog/nyc-early-childhood-survey-2026' },
      { label: 'Look for providers that offer multiple early-years programs', href: '/guides/2k-3k-prek-kindergarten-same-school' },
      { label: 'Compare kindergarten options for Fall 2027', href: `/guides/${kindergartenSlug}` },
    ],
    next: preKApplication,
  },
  {
    slug: kindergartenSlug, kind: 'editorial', shortlistMode: 'kindergarten', reviewedAt,
    title: 'Best NYC Kindergarten Options for Fall 2027: Compare by Borough',
    description: 'Build a fall 2027 NYC kindergarten shortlist with up to two schools per district, published enrollment, grade 3 context, and questions to ask on a visit.',
    answer: 'Start with your zoned option, if you have one, then check one or two schools in a district you can realistically get to. Confirm language access, accessibility, or after-school care before looking at scores. These examples are not a ranking of kindergarten classrooms.',
    verified: {
      heading: 'Six kindergarten options across the five boroughs',
      caption: 'NYCPS school profiles were checked November 14, 2026. Grade spans exclude separately listed special education codes. Check Fall 2027 program cards, priorities and current services before applying.',
      firstColumn: 'Borough and school',
      columns: ['What NYCPS lists', 'Why put it on your visit list?', 'What to verify'],
      rows: [
        { name: 'Manhattan · The 47 American Sign Language & English Lower School (02M347)', dbKey: '02M347', profile: '/school/02m347-the-47-american-sign-language-english-lower-school', cells: ['District 2; pre-K through grade 8; fully accessible.', 'Explore an ASL and English school setting and the option of staying through middle grades.', 'Ask how ASL is used in kindergarten and read the specific program and priorities in MySchools.'], sources: [school('M347'), { label: 'The 47: ASL and English approach', href: 'https://ps347.org/' }] },
        { name: 'Manhattan · The Bilingual Bicultural School (04M182)', dbKey: '04M182', profile: '/school/04m182-the-bilingual-bicultural-school', cells: ['District 4; pre-K through grade 5; fully accessible.', 'A second Manhattan visit if you are comparing language environments and school size.', 'Confirm which language program is listed for kindergarten and how students enter it.'], sources: [school('M182')] },
        { name: 'Brooklyn · P.S. 172 Beacon School of Excellence (15K172)', dbKey: '15K172', profile: '/school/15k172-ps-172-beacon-school-of-excellence', cells: ['District 15; pre-K through grade 5.', 'The school describes a kindergarten read-aloud unit where children retell and act out familiar stories.', 'Ask to see a typical literacy block. Check exact address priority and whether after-school places are separate.'], sources: [school('K172'), { label: 'P.S. 172 kindergarten curriculum', href: 'https://www.ps172.org/kindergarten' }] },
        { name: 'Bronx · P.S. 069 Journey Prep School (08X069)', dbKey: '08X069', profile: '/school/08x069-ps-069-journey-prep-school', cells: ['District 8; pre-K through grade 5.', 'Consider a local school that serves both pre-K and kindergarten. A useful visit if you have younger siblings.', 'Ask how kindergarten teachers help children adjust, and verify admissions priority separately for each child.'], sources: [school('X069')] },
        { name: 'Queens · The Active Learning Elementary School (25Q244)', dbKey: '25Q244', profile: '/school/25q244-the-active-learning-elementary-school', cells: ['District 25; pre-K through grade 3; fully accessible.', 'Worth considering if a shorter grade span and a building listed as accessible suit your family.', 'Assume you will need to plan for a transition after grade 3. Ask where students go next and confirm room-by-room access if needed.'], sources: [school('Q244')] },
        { name: 'Staten Island · The Stephanie A. Vierno School (31R041)', dbKey: '31R041', profile: '/school/31r041-the-stephanie-a-vierno-school', cells: ['District 31; pre-K through grade 5.', 'A starting visit if you need an elementary option with continuity beyond the early grades.', 'Verify address priority and whether the dismissal and transportation plan work on a typical weekday.'], sources: [school('R041')] },
      ],
      takeaway: 'Grade span changes the family decision. NYCPS lists The Active Learning Elementary School through grade 3 and The 47 through grade 8. If both meet your immediate needs, ask what the next transition looks like. If either fails your commute, care, or eligibility checks, keep looking locally rather than ranking it on reputation.',
    },
    columns: ['When comparing schools', 'Better evidence', 'What to avoid'],
    comparison: [
      ['Eligibility', 'Exact home address and the priority on the specific MySchools program card', 'Assuming a ZIP code, borough, or nearby building guarantees a seat'],
      ['Kindergarten experience', 'A visit, daily classroom routine, language or accessibility needs, and teacher communication', 'Treating tests from older grades as kindergarten classroom results'],
      ['Care and continuity', 'Arrival and pickup times, confirmed after-school arrangements and last grade served', 'Assuming after-school care is included or that every elementary school continues through grade 5'],
    ],
    questions: [
      { title: 'What a larger kindergarten cohort means', text: 'A larger grade cohort tells you how many kindergarteners were enrolled that year, not how many children shared a classroom. Ask how many classrooms the school expects and what the usual class size is. For a school with a shorter grade span, ask when your child would need to move to another school.' },
      { title: 'How to use spring 2026 results on school profiles', text: 'When a linked profile displays spring 2026 ELA or math proficiency, those are state results from tested grades, not kindergarten. Check the assessment year and participation before comparing schools. Missing results are not a low score. Use visit questions and program details to judge whether the kindergarten classroom fits your child.' },
      { title: 'How to build a three-school shortlist', text: 'Start with your zoned school, if you have one and would consider it. Add a program that meets a specific need, then add another with a workable commute and care schedule. Put the same questions to all three: What does a typical morning look like? How does the teacher communicate? What happens after dismissal? Check MySchools for each program before you apply.' },
    ],
    sources: [officialK, { label: 'NYCPS Find a School: check your exact address', href: 'https://schoolsearch.schools.nyc/' }, enrollment, { label: 'NYCPS state test results: grade and year coverage', href: 'https://infohub.nyced.org/reports/academics/test-results' }],
    related: [
      { label: 'Browse NYC public elementary school profiles', href: '/nyc-schools/elementary-schools' },
      { label: 'Explore dual-language programs', href: '/program/dual-language' },
      { label: 'Understand districts versus school zones', href: '/guides/nyc-school-district-map-and-zones' },
      { label: 'Read the separate 2026 kindergarten comparison', href: '/blog/best-nyc-kindergartens-2026' },
      { label: 'Compare pre-K programs for Fall 2027', href: `/guides/${preKSlug}` },
    ],
    next: kindergartenApplication,
  },
];
