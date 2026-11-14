import type { ParentGuide } from './parent-guides';

const nycps = 'https://www.schools.nyc.gov/enrollment/enroll-grade-by-grade/middle-school';
const auditions = `${nycps}/MSAuditions`;
const privateGuide = '/guides/private-middle-schools-nyc';
const screenedGuide = '/guides/screened-middle-schools-nyc';
const publicMiddle = '/nyc-schools/middle-schools';
const rankings = '/blog/best-nyc-middle-schools-2026';

export const MIDDLE_SCHOOL_GUIDES: ParentGuide[] = [
  {
    slug: 'private-middle-schools-nyc', kind: 'editorial', reviewedAt: '2026-11-14',
    title: 'NYC Private Middle Schools: Grade 6 Entry, Tuition & Aid',
    description: 'Compare four NYC private middle-school options for grade 6 entry, published tuition, and financial aid. See which schools add a cohort and which depend on openings.',
    answer: 'Start by asking which private schools regularly take new sixth graders. Horace Mann and Riverdale list grade 6 as a regular entry point. Packer starts its middle division in grade 5, and both Packer and Trinity depend on openings from departing students for grade 6. Check entry first, then compare the full cost after aid and the daily commute.',
    verified: {
      heading: 'Four private schools: Where can a new sixth grader apply?',
      caption: 'Admissions policies checked November 14, 2026 for 2027–28 planning. The published prices below are from 2026–27, not quotes for 2027–28. These are examples, not a ranking or live seat count.',
      columns: ['Grade 6 entry', '2026–27 published price', 'What to check next'],
      rows: [
        { name: 'Horace Mann School · Bronx', profile: '/private-school/horace-mann-school-a1702599', cells: ['Regular entry. The school estimates 55–60 new grade 6 students in a typical year.', '$68,700 tuition', 'The school describes a new full-tuition program for eligible admitted families starting in 2027–28. Check its criteria and the aid deadline.'], sources: [{ label: 'Admissions: grades 6–11', href: 'https://www.horacemann.org/admissions/applying-to-grades-6-11' }, { label: 'Tuition and aid', href: 'https://www.horacemann.org/admissions/tuition-financial-aid' }] },
        { name: 'Riverdale Country School · Bronx', cells: ['Regular entry. The school lists 20–25 typical openings in grade 6 and 5–10 in grade 7.', '$71,350 tuition', 'Try the commute to the Hill Campus. The school lists ISEE or SSAT for grade 6 applicants. Check aid alongside the application.'], sources: [{ label: 'Admissions and entry points', href: 'https://www.riverdale.edu/admission/admissions-process/' }, { label: 'Tuition and aid', href: 'https://www.riverdale.edu/admission/financial-aid/' }, { label: 'Middle School campus', href: 'https://www.riverdale.edu/contact-directions/' }] },
        { name: 'The Packer Collegiate Institute · Brooklyn', cells: ['Grade 5 is the main middle-school entry. Grades 6–8 depend on students leaving.', '$65,275 tuition and fees', 'The published amount includes lunch and a laptop in grade 6. Ask whether there is a grade 6 opening before applying.'], sources: [{ label: 'Entry grades and admissions FAQ', href: 'https://www.packer.edu/admissions/faq' }, { label: 'Tuition, fees and aid', href: 'https://www.packer.edu/admissions/affording-packer' }] },
        { name: 'Trinity School · Manhattan', profile: '/private-school/trinity-school-00942722', cells: ['Grade 6 is not a regular entry point. The school considers applicants only when a current student leaves.', 'Confirm the year-specific amount with the school.', 'Ask when the school expects to know about openings. Trinity lists January 8, 2027 as the aid deadline for prospective families.'], sources: [{ label: 'Admissions: non-entry grades', href: 'https://www.trinityschoolnyc.org/admissions/admissions-5-12' }, { label: 'Tuition and aid deadlines', href: 'https://www.trinityschoolnyc.org/admissions/tuition-fees-and-financial-aid' }] },
      ],
      takeaway: 'If your child is already in fifth grade, put regular sixth-grade entry schools on the shortlist first. Include schools that rely on openings only if you have another option you would be happy to take. Among schools with an exact price in this sample, the published amounts range from $65,275 to $71,350, but one includes fees and others quote tuition. Compare what your family would actually pay after aid, required fees and transportation.',
    },
    columns: ['Decision', 'What to verify', 'What not to assume'],
    comparison: [
      ['Grade and campus', 'Year of entry, whether applications are reviewed for grade 6, and the division’s actual address', 'The school’s grade span means it has openings, or the elementary campus is the middle-school campus'],
      ['Application and aid', 'Tests or interviews, separate aid forms and deadlines, and when the deposit is due', 'Every school follows the same timeline or the admissions application doubles as an aid application'],
      ['Daily fit and cost', 'Commute, learning support, after-school options, fees, and what aid covers each year', 'A list price is your family’s final cost, or a whole-school ratio is the size of a grade 6 class'],
    ],
    questions: [
      { title: 'How do I tell whether sixth grade is really an entry point?', text: 'Look on the admissions page for “entry points” or “openings.” If the page says “attrition,” the school needs a current student to leave before it can admit someone new. An application link alone does not tell you whether there is room. Ask the admissions office before paying a fee or booking a test.' },
      { title: 'How should I compare financial aid?', text: 'Ask two schools for the same figures: next year’s tuition, required fees, and what aid can cover. Add transport and after-school costs, then subtract a confirmed aid award. Note whether aid is reviewed every year and whether the contract deadline gives you time to compare offers. Keep a public-school option on the shortlist if the private-school cost depends on aid.' },
      { title: 'What should I ask on a middle-school visit?', text: 'Ask how new sixth graders join an established class, who they go to when work becomes difficult, and how families hear about progress. Ask whether continuing students need a separate application at the next division. These answers tell you more about your child’s experience than a private-school ranking unsupported by comparable outcomes.' },
    ],
    sources: [
      { label: 'NCES Private School Universe Survey', href: 'https://nces.ed.gov/surveys/pss/index.asp' },
      { label: 'NCES: what the private-school directory reports', href: 'https://nces.ed.gov/surveys/pss/privateschoolsearch/aboutdata.asp' },
    ],
    related: [
      { label: 'Brooklyn private-school guide', href: '/guides/private-schools-brooklyn' },
      { label: 'NYC private elementary-school guide', href: '/guides/private-elementary-schools-nyc' },
      { label: 'How screened public middle-school admissions work', href: screenedGuide },
      { label: 'Browse public middle schools', href: publicMiddle },
    ],
    next: { label: 'Browse private schools serving middle grades', href: '/private-schools?grade=middle#school-results' },
  },
  {
    slug: 'screened-middle-schools-nyc', kind: 'editorial', reviewedAt: '2026-11-14',
    title: 'Screened Middle Schools in NYC: Fall 2027 Admissions',
    description: 'See verified screened middle-school programs, how fourth-grade marks and priorities work, and what differs for zoned programs, auditions and talent tests in fall 2027.',
    answer: 'In NYC public middle-school admissions, “screened” applies to a specific program, not necessarily the whole school. For fall 2027, NYCPS says screened programs rank students using fourth-grade course grades on a 1–4 scale, then make offers by priority group and rank. The main application closes December 11, 2026. Check the exact program in MySchools before making your list.',
    verified: {
      heading: 'Three screened programs and two other ways to apply',
      caption: 'School and NYCPS sources checked November 14, 2026. The citywide calendar is for fall 2027; rows distinguish explicitly dated program rules from school pages that do not date their criteria. This is not an exhaustive list.',
      columns: ['Method', 'What the official source says', 'What to do in MySchools'],
      rows: [
        { name: 'Columbia Secondary School · 05M362', profile: '/school/05m362-columbia-secondary-school', cells: ['Screened · 2027–28 listed', 'The school lists final fourth-grade marks in math, ELA, science and social studies, and geographic priorities for specified areas in Manhattan.', 'Verify your priority group on the program card; do not infer it from the school’s district number.'], sources: [{ label: 'School: fall 2027 middle-school admissions', href: 'https://www.columbiasecondary.org/admissions/applying-to-middle-school' }, { label: 'MySchools school listing', href: 'https://www.myschools.nyc/en/schools/middle-school/05M362/' }] },
        { name: 'Simon Baruch Screened Program · 02M104', profile: '/school/02m104-jhs-104-simon-baruch', cells: ['Screened · school page lists fall 2026 tours', 'The school describes a separate accelerated-math program that uses fourth-grade report-card marks.', 'Select the screened program explicitly. If the general program is also a fit, add it separately.'], sources: [{ label: 'School: screened and general choices', href: 'https://www.ms104.com/admissions' }, { label: 'MySchools school listing', href: 'https://www.myschools.nyc/en/schools/middle-school/02M104/' }] },
        { name: 'MS 343 Screened Program · 07X343', profile: '/school/07x343-academy-of-applied-mathematics-and-technology', cells: ['Screened · program criteria not cycle-dated', 'The Bronx school describes a dedicated screened cohort selected using fourth-grade report cards.', 'Check that the screened program is listed for your year and confirm its current criteria and priorities.'], sources: [{ label: 'School: screened program and application process', href: 'https://www.ms343.com/screened-class' }, { label: 'MySchools school listing', href: 'https://www.myschools.nyc/en/schools/middle-school/07X343/' }] },
        { name: 'Simon Baruch General Program · 02M104', profile: '/school/02m104-jhs-104-simon-baruch', cells: ['General program · distinct from the screen', 'The school lists this as another program at the same school. The screened route is not the only program families can consider.', 'Read the general program’s priorities. List it in your true preference order if you would attend.'], sources: [{ label: 'School: general and screened options', href: 'https://www.ms104.com/admissions' }] },
        { name: 'Professional Performing Arts School: Theatrical Arts · 02M408', profile: '/school/02m408-professional-performing-arts-high-school', cells: ['Arts audition · fall 2027', 'NYCPS lists an audition with a monologue and a song. This is an arts audition rather than the fourth-grade academic screen.', 'Add the program and submit the required audition materials by December 11, 2026.'], sources: [{ label: 'NYCPS: audition instructions and dates', href: auditions }] },
      ],
      takeaway: 'A school profile can help you judge fit, but use the program card to decide how to apply. Simon Baruch shows why: adding its general program does not apply to its screened program. Columbia Secondary shows why it is worth checking your priority as well as the grading method. A school rating does not tell you either of those things.',
    },
    columns: ['Admissions method or priority', 'What matters', 'Parent action'],
    comparison: [
      ['Screened', 'Fourth-grade course marks; offers follow program priorities and rank', 'Check the exact screened program and your priority group'],
      ['Open with zone or district priority', 'Priority groups and random selection, rather than the academic screen', 'Verify your zone and compare the priorities for that program'],
      ['Arts audition', 'The specific program’s performance or portfolio requirements', 'Add the program and submit the required audition separately'],
      ['Talent test', 'A program-specific test rather than the standard academic screen', 'Check whether advance registration is required; not all Mark Twain programs use the same method'],
    ],
    questions: [
      { title: 'What are the fall 2027 dates?', text: 'The NYCPS application opened October 14, 2026. The main application and virtual audition materials are due December 11, 2026. Registration for the Mark Twain and District 21 talent tests closed November 2, 2026. NYCPS lists April 7, 2027 for offers. The early test-registration deadline is not the main application deadline.' },
      { title: 'Does a district boundary keep me from listing a school?', text: 'NYCPS says families can now list NYC public middle schools across the city. That does not remove zone or district priorities, which can strongly affect who receives offers. Log into MySchools to see the programs your child can add and the priorities shown on your application. Rank programs in the order you would actually choose them.' },
      { title: 'Can I calculate admissions odds from grades or school ratings?', text: 'No. Priorities, the applicant pool and the number of seats vary by program and cycle. Our school ratings and profiles help you compare schools; they are not admissions criteria or a forecast. Include programs you would attend where your child has a higher priority or does not need to pass a screen.' },
    ],
    sources: [
      { label: 'NYCPS: fall 2027 dates, screening and admissions priorities', href: nycps },
      { label: 'NYCPS: fall 2027 auditions and talent tests', href: auditions },
      { label: 'MySchools public middle-school program directory', href: 'https://www.myschools.nyc/en/schools/middle-school/' },
    ],
    related: [
      { label: 'Explore NYC middle-school profiles', href: publicMiddle },
      { label: 'Read the NYC middle-school data analysis', href: rankings },
      { label: 'Explore District 2 schools', href: '/district/2' },
      { label: 'Compare private NYC middle-school entry and costs', href: privateGuide },
    ],
    next: { label: 'Check your program in MySchools', href: 'https://www.myschools.nyc/en/schools/middle-school/' },
  },
];
