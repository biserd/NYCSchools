import type { ParentGuide } from './parent-guides';

const enrollment = 'https://www.schools.nyc.gov/enrollment/enroll-grade-by-grade';
const timeline = { label: 'NYCPS Fall 2027 admissions calendar', href: enrollment };
const kindergarten = { label: 'NYCPS kindergarten admissions and priorities', href: `${enrollment}/kindergarten` };
const threeK = { label: 'NYCPS 3-K admissions and seat types', href: `${enrollment}/3k` };
const preK = { label: 'NYCPS pre-K admissions and seat types', href: `${enrollment}/pre-k` };
const mySchools = { label: 'Open MySchools to check programs and apply', href: 'https://www.myschools.nyc/en/' };
const welcomeCenter = { label: 'NYCPS Family Welcome Centers', href: 'https://www.schools.nyc.gov/enrollment/enrollment-help/family-welcome-centers' };
const kindergartenGuide = '/guides/nyc-kindergarten-admissions-2027';
const earlyYearsGuide = '/guides/nyc-3k-prek-applications-2027';

export const FALL_2027_ADMISSIONS_GUIDES: ParentGuide[] = [
  {
    slug: 'nyc-kindergarten-admissions-2027', kind: 'editorial', reviewedAt: '2026-11-14',
    title: 'NYC Kindergarten Admissions 2027: How to Apply',
    description: 'Applying to NYC kindergarten for fall 2027? Check eligibility for children born in 2022, the January 22 deadline, school zones, and how to rank choices in MySchools.',
    answer: 'If your child lives in NYC and was born in 2022, apply for kindergarten for fall 2027. The application opens December 9, 2026 and closes January 22, 2027. Apply even if your child already attends pre-K at the school you want. Your child is guaranteed a public kindergarten seat, but not necessarily at your first choice.',
    verified: {
      heading: 'Fall 2027 kindergarten application dates',
      caption: 'For children entering kindergarten in the 2027–28 school year. NYCPS may update these dates; confirm the calendar before submitting.',
      firstColumn: 'Milestone',
      columns: ['NYCPS date', 'What to do'],
      rows: [
        { name: 'Applications open', cells: ['December 9, 2026', 'Confirm your address and start a list of programs you would actually accept.'], sources: [kindergarten] },
        { name: 'Application deadline', cells: ['January 22, 2027', 'Put programs in your true order of preference, submit, and save your confirmation.'], sources: [kindergarten] },
        { name: 'Offers released', cells: ['March 30, 2027', 'Open your offer in MySchools and follow the school’s registration instructions.'], sources: [kindergarten] },
      ],
      takeaway: 'You apply in winter 2026–27 for a seat that starts in fall 2027. You don’t need to wait for a new school ratings release to look up your address or build your shortlist.',
    },
    columns: ['Your situation', 'What to check', 'What to do on the application'],
    comparison: [
      ['You have a zoned school', 'Use the official address lookup. A school can be the closest to you without being your zoned school.', 'Include the zoned program if you would accept it. Put any program you genuinely prefer above it.'],
      ['You’re considering a non-zoned school', 'Read the exact program card. Sibling, current pre-K, and district priorities can vary.', 'List the program if you would attend, and make sure your application records any priority that applies.'],
      ['Your child already attends pre-K at the school', 'At a NYCPS public elementary school, current pre-K enrollment can confer priority. It is not automatic admission.', 'Submit a kindergarten application and list the program.'],
      ['One school lists multiple programs', 'Standard kindergarten, dual language, and Gifted & Talented may appear as separate choices. Gifted & Talented has separate eligibility.', 'Add each program you want by its exact name and rank the choices by preference.'],
    ],
    questions: [
      { title: 'Before applying: find your zoned school', text: 'Use NYCPS Find a School with your exact home address, then confirm what appears in MySchools. If no zoned school appears, build a list of non-zoned programs you would attend and contact a Family Welcome Center if you need help. Our district and borough pages can help you plan a realistic commute, but they do not establish admissions priority.' },
      { title: 'When applying: rank programs the way you would choose them', text: 'Start with the program you would choose if you had every offer. Then list the next one you would take, even if it is at the same school. Putting one program lower on your list does not change your priority for that program. Check sibling and current-school details, submit, and save the confirmation.' },
      { title: 'When offers arrive: check the next action in MySchools', text: 'Read the offer and school registration instructions. If you are waiting on a preferred program, keep track of your current offer and its deadlines while you check waitlist options. If you missed the application deadline or have just moved to NYC, use a Family Welcome Center to confirm how to enroll.' },
    ],
    sources: [timeline, kindergarten, { label: 'NYCPS Find a School: check your exact address', href: 'https://schoolsearch.schools.nyc/' }, welcomeCenter],
    related: [
      { label: 'Compare NYC elementary school profiles', href: '/nyc-schools/elementary-schools' },
      { label: 'See the 2026 kindergarten school comparison and its data years', href: '/blog/best-nyc-kindergartens-2026' },
      { label: 'Understand school districts and attendance zones', href: '/guides/nyc-school-district-map-and-zones' },
      { label: 'Applying for a younger child? See Fall 2027 3-K and pre-K', href: earlyYearsGuide },
    ],
    next: mySchools,
  },
  {
    slug: 'nyc-3k-prek-applications-2027', kind: 'editorial', reviewedAt: '2026-11-14',
    title: 'NYC 3-K & Pre-K Applications 2027: Dates and Eligibility',
    description: 'Find the fall 2027 NYC 3-K and pre-K application dates, eligible birth years, and the differences between School Day, Extended Day and Year, and City Transitional seats.',
    answer: 'For fall 2027, NYC children born in 2024 apply to 3-K, and those born in 2023 apply to pre-K. Both applications open January 13, 2027 and close February 26, 2027. The two programs have different offer dates. Check both the location and seat type before adding a program to your list.',
    verified: {
      heading: 'Fall 2027 3-K and pre-K dates by birth year',
      caption: 'Dates are for 2027–28 entry, not for a seat in the current school year. NYCPS says dates are subject to change.',
      firstColumn: 'Program',
      columns: ['Birth year', 'Application window', 'Offers released'],
      rows: [
        { name: '3-K', cells: ['2024', 'January 13 to February 26, 2027', 'May 18, 2027'], sources: [threeK, timeline] },
        { name: 'Pre-K', cells: ['2023', 'January 13 to February 26, 2027', 'May 11, 2027'], sources: [preK, timeline] },
      ],
      takeaway: 'The application window is the same, but your child’s birth year determines which application to use. If you need summer or longer-day care, filter for that seat type before you rank choices. Another seat at the same address may have different hours or eligibility.',
    },
    columns: ['Seat type', 'Schedule', 'What to check before applying'],
    comparison: [
      ['School Day', 'Free; 6 hours and 20 minutes per day during the school year.', 'Open to age-eligible NYC children. Ask the site about exact drop-off and pickup times and any optional care.'],
      ['Extended Day and Year', 'Year-round, including summer; longer days than School Day.', 'Eligibility depends on family income and needs. Confirm the schedule and required child care eligibility steps with NYCPS.'],
      ['City Transitional', 'Free; 8 or 10 hours per day, year-round, at participating sites.', 'Family income and needs affect priority. Read the exact listing and confirm hours and enrollment steps with the provider.'],
    ],
    questions: [
      { title: 'Before applying: make a list that works for your schedule', text: 'Compare the full trip at drop-off and pickup time, the school-day hours, and whether you need care in summer. Find the actual site in MySchools and check which seat types it lists. If a site offers more than one, confirm that you selected the one you want. A directory listing does not show current vacancies.' },
      { title: 'When applying: check priorities and list choices in order', text: 'A current student or sibling priority can matter, depending on the program. For example, pre-K at a center may give priority to children in that center’s 3-K program. Do not assume that attending 3-K automatically enrolls your child in pre-K. List the pre-K program and provide current-student information where requested. Submit choices in the order you actually prefer.' },
      { title: 'After you receive an offer: verify hours and any documents', text: 'Read the program and seat type in MySchools, then confirm registration details with the provider. For an Extended Day and Year offer, NYCPS says to confirm eligibility by completing the child care application through MyCity. If you need care before fall 2027, use the current-year MySchools options rather than waiting for this application cycle.' },
      { title: 'Does this calendar include 2-K?', text: 'No. NYCPS lists the fall 2027 2-K admissions timeline separately as coming soon. Do not use the 3-K or pre-K deadlines for 2-K. Check the official timeline for updates.' },
    ],
    sources: [timeline, threeK, preK, welcomeCenter],
    related: [
      { label: 'Browse NYC 3-K program profiles', href: '/program/3k' },
      { label: 'Browse NYC pre-K program profiles', href: '/program/prek' },
      { label: 'Find providers offering more than one early-years program', href: '/guides/2k-3k-prek-kindergarten-same-school' },
      { label: 'Read the historical early-years admissions analysis', href: '/blog/nyc-prek-3k-kindergarten-admissions-demand-2025' },
      { label: 'Looking ahead? See Fall 2027 kindergarten admissions', href: kindergartenGuide },
    ],
    next: mySchools,
  },
];
