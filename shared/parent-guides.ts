// Editorial definitions are shared by the HTML renderer and the lazy client route.
export type GuideLink = { label: string; href: string };
export type ParentGuide = {
  slug: string; title: string; description: string; answer: string;
  kind: 'zones' | 'private' | 'continuity' | 'comparison'; dbns?: string[];
  questions: Array<{ title: string; text: string }>;
  columns: string[]; comparison: string[][];
  sources: GuideLink[]; related: GuideLink[]; next: GuideLink;
};
const doe = 'https://www.schools.nyc.gov/enrollment/enroll-grade-by-grade/';
export const GUIDE_REVIEWED = '2026-10-25';
export const PARENT_GUIDES: ParentGuide[] = [
  {
    slug: 'nyc-school-district-map-and-zones', kind: 'zones',
    title: 'NYC School District Map: Districts, Zones and Your Address',
    description: 'Understand NYC school districts versus attendance zones, compare neighborhood search boundaries, and verify your address before building a school shortlist.',
    answer: 'Use a district map to explore schools, not to prove eligibility. Your district, a school’s attendance zone, and a neighborhood name describe different boundaries. Check your exact home address with NYC Public Schools before making an enrollment or housing decision.',
    columns: ['Boundary', 'Useful for', 'Does not establish'],
    comparison: [
      ['Community school district', 'Finding schools within a numbered NYC district', 'A place at every school in the district'],
      ['Attendance zone', 'Checking address-based priority for a particular school', 'Current seat availability or an offer'],
      ['Neighborhood / ZIP code', 'Exploring nearby options and everyday travel', 'An official school zone'],
    ],
    questions: [
      { title: 'How to use the NYC school district map', text: 'Start with your district, choose the age or grade program, then open school profiles. Compare realistic morning travel and admissions pathways before comparing scores. A nearby marker can be in a different zone.' },
      { title: 'Why District 2 is not the Upper East Side', text: 'A district search and a neighborhood search answer different questions. Our District 2 page uses each school’s recorded district. Our Upper East Side page uses listed ZIP codes as a discovery shortcut; those ZIP codes are not an attendance boundary.' },
      { title: 'Before signing a lease or applying', text: 'Enter the full address in the official Find a School tool, check the relevant grade, and confirm the result and current rules with NYCPS or the school. Do not infer a zone from a ZIP code or an adjacent building.' },
    ],
    sources: [{ label: 'NYCPS official address lookup', href: 'https://schoolsearch.schools.nyc/' }, { label: 'NYCPS kindergarten: zones and priorities', href: doe + 'kindergarten' }],
    related: [{ label: 'District 2 schools', href: '/district/2' }, { label: 'Upper East Side schools', href: '/neighborhood/upper-east-side' }, { label: 'Park Slope schools', href: '/neighborhood/park-slope' }],
    next: { label: 'Explore the school map', href: '/map?district=all' },
  },
  {
    slug: 'private-elementary-schools-nyc', kind: 'private',
    title: 'Private Elementary Schools in NYC: Compare Your Options',
    description: 'Compare NYC private elementary schools by borough, grade span and reported enrollment. See data coverage, missing information and questions to ask about cost and admissions.',
    answer: 'The best private elementary school is a fit decision, not a defensible citywide test-score ranking. Start with grade span and travel, then verify teaching approach, learning support and the full annual cost with each school. Our directory data supports a shortlist, not a claim that one private school is academically best.',
    columns: ['Decision', 'Compare', 'Ask the school'],
    comparison: [
      ['Daily fit', 'Borough, address and entry grade', 'Can we visit during a normal school day?'],
      ['Continuity', 'Elementary-only versus a longer grade span', 'Does continuing to the next division require another application?'],
      ['Classroom experience', 'Reported enrollment and stated programs', 'What are actual class sizes and learning-support arrangements?'],
      ['Affordability', 'Current tuition plus required extras', 'What are the dated fee schedule and aid deadlines?'],
    ],
    questions: [
      { title: 'What the data can—and cannot—compare', text: 'NCES directory records are useful for school identity, grades and enrollment. They are not a common academic assessment of private schools. We do not apply public-school test ratings to these records or interpret a missing tuition field as free tuition.' },
      { title: 'Compare like with like', text: 'Whole-school enrollment at a K–12 school is not its elementary enrollment. A student–teacher ratio is not class size. Use the grade span next to every enrollment number, and request division-specific figures before drawing conclusions.' },
      { title: 'Build a shortlist with evidence', text: 'Choose two or three feasible commutes. Ask each school the same questions about literacy instruction, differentiation, support staffing, after-school arrangements and total cost. Keep dated answers so that your comparison reflects the same admission year.' },
    ],
    sources: [{ label: 'NCES Private School Universe Survey: scope and collected fields', href: 'https://nces.ed.gov/surveys/pss/index.asp' }, { label: 'NCES private-school directory: about the data', href: 'https://nces.ed.gov/surveys/pss/privateschoolsearch/aboutdata.asp' }],
    related: [{ label: 'Public elementary school guide', href: '/blog/best-nyc-elementary-schools-2026' }, { label: 'Districts versus zones', href: '/guides/nyc-school-district-map-and-zones' }],
    next: { label: 'Browse the full private-school directory', href: '/private-schools' },
  },
  {
    slug: '2k-3k-prek-kindergarten-same-school', kind: 'continuity',
    title: '2-K, 3-K, Pre-K and Kindergarten at the Same NYC School',
    description: 'Find recorded overlaps between 2-K, 3-K, pre-K and kindergarten. Compare canonical school records and understand why program continuity is not guaranteed admission.',
    answer: 'Look for multiple programs on one verified school record—not just a shared address. A provider can offer 2-K, 3-K and pre-K without offering kindergarten. Even when the next program is in the same school, families may need to apply again; a priority is not an automatic place.',
    columns: ['Transition', 'What to check', 'What not to assume'],
    comparison: [
      ['2-K → 3-K', 'Both flags on the same school record; current eligibility and seat type', 'A 2-K place guarantees a 3-K offer'],
      ['3-K → pre-K', 'Same program/provider and current-student priority rules', 'Every provider continues through elementary school'],
      ['Pre-K → kindergarten', 'An explicit kindergarten grade and the school’s admission priorities', 'Pre-K enrollment removes the need to apply for kindergarten'],
    ],
    questions: [
      { title: 'What our overlap analysis can tell you', text: 'We count each canonical school identifier once and check its 2-K, 3-K and pre-K flags independently. Kindergarten is counted only when the stored grade range explicitly includes K. A shared name, building or operator is not enough to merge providers.' },
      { title: 'Current-student priority is not automatic progression', text: 'NYCPS describes current-student priority for pre-K and pre-K priority in kindergarten admissions. The applicable program, address and other priority groups still matter. Check the current application rules and submit the required application.' },
      { title: 'Questions for a provider visit', text: 'Ask which age programs operate at this exact site, whether your child must reapply, which seat types and hours are available, and where children go after the final offered grade. Request the official program identifier rather than relying on a similar name.' },
    ],
    sources: [{ label: 'NYCPS 3-K admissions', href: doe + '3k' }, { label: 'NYCPS pre-K current-student priority', href: doe + 'pre-k' }, { label: 'NYCPS kindergarten applications and priorities', href: doe + 'kindergarten' }],
    related: [{ label: '3-K programs', href: '/program/3k' }, { label: 'Pre-K programs', href: '/program/prek' }, { label: '2-K provider map', href: '/map?district=all&source=twok' }],
    next: { label: 'Explore pre-K school profiles', href: '/program/prek' },
  },
  {
    slug: 'ps6-vs-ps290', kind: 'comparison', dbns: ['02M006', '02M290'],
    title: 'P.S. 6 vs P.S. 290: Upper East Side Elementary Comparison',
    description: 'Compare P.S. 6 and P.S. 290 using recorded grades, assessment years and ELA/math proficiency, with address-priority and missing-data caveats.',
    answer: 'Start with your address and the current admissions route, then compare the schools’ evidence and daily fit. A higher proficiency percentage alone does not identify the better school for your child or establish eligibility.',
    columns: ['Decision', 'Use this evidence', 'Avoid this shortcut'],
    comparison: [
      ['Can we realistically attend?', 'Official address lookup and current program priorities', 'Assuming an Upper East Side address qualifies for both'],
      ['Academic comparison', 'ELA and math for the same assessment year, with tested-count context', 'Calling a small difference proof of better teaching'],
      ['Family fit', 'School visits, support needs, travel and current family feedback', 'Treating a composite score as a universal recommendation'],
    ],
    questions: [
      { title: 'Read the two profiles together', text: 'The table below uses DBNs, not a name search. Compare assessment years before comparing percentages, and open the profiles for tested counts, participation and historical context. Missing results are not zero and are not a negative quality judgment.' },
      { title: 'What the comparison does not establish', text: 'Proficiency describes the tested student population. It does not isolate a school’s causal effect, the support your child will receive, or the likelihood of admission. Our published rating is a site calculation, not an official NYCPS rating.' },
    ],
    sources: [{ label: 'NYSED public assessment data', href: 'https://data.nysed.gov/' }, { label: 'NYCPS kindergarten admissions', href: doe + 'kindergarten' }, { label: 'Our rating methodology', href: '/methodology' }],
    related: [{ label: 'Upper East Side school guide', href: '/neighborhood/upper-east-side' }, { label: 'District 2 school guide', href: '/district/2' }, { label: 'Elementary school analysis', href: '/blog/best-nyc-elementary-schools-2026' }],
    next: { label: 'Check your address with NYCPS', href: 'https://schoolsearch.schools.nyc/' },
  },
  {
    slug: 'townsend-harris-vs-stuyvesant', kind: 'comparison', dbns: ['25Q525', '02M475'],
    title: 'Townsend Harris vs Stuyvesant: Admissions and School Comparison',
    description: 'Compare Townsend Harris and Stuyvesant by location, grade span and admissions pathway. Understand screened assessment versus SHSAT without invented acceptance odds.',
    answer: 'These schools use different admissions pathways. Townsend Harris is a screened-with-assessment option; Stuyvesant is one of the testing specialized high schools. Compare application requirements and the everyday commute before treating their positions in any ranking as interchangeable.',
    columns: ['Question', 'Townsend Harris', 'Stuyvesant'],
    comparison: [
      ['School identifier', '25Q525', '02M475'],
      ['Admissions pathway', 'Screened with assessment; check current NYCPS requirements', 'SHSAT pathway; check current specialized-school requirements'],
      ['Planning task', 'Review assessment instructions and application priorities', 'Review test registration, school ordering and test guidance'],
      ['Can a rating predict admission?', 'No', 'No'],
    ],
    questions: [
      { title: 'Two application pathways, not a single odds calculator', text: 'Follow the official instructions for each pathway. The admissions comparison was reviewed on October 25, 2026, against NYCPS guidance for fall 2027 entry. Recheck before applying; we do not infer offer probabilities from a school score.' },
      { title: 'Compare outcomes in their proper context', text: 'Grades 3–8 ELA and math are not a suitable high-school comparison. Use the linked profiles for graduation, Regents and college-readiness measures where available, checking each measure’s cohort and year. Selective intake also limits what outcome differences can tell you about teaching effectiveness.' },
      { title: 'Make the daily experience part of the decision', text: 'Test both commutes at the time your child would travel. At visits, ask about required courses, workload, student support and access to activities. Those answers can distinguish two strong options more usefully than a small ranking gap.' },
    ],
    sources: [{ label: 'NYCPS graduation results', href: 'https://infohub.nyced.org/reports/academics/graduation-results' }, { label: 'NYCPS assessments for screened schools: fall 2027', href: doe + 'high-school/assessments-for-screened-schools' }, { label: 'NYCPS specialized high school admissions', href: doe + 'specialized-high-schools' }, { label: 'Rating methodology and limitations', href: '/methodology' }],
    related: [{ label: 'Specialized high schools', href: '/program/specialized-high-schools' }, { label: 'Screened high schools', href: '/program/screened-high-schools' }, { label: 'NYC high school guide', href: '/nyc-schools/high-schools' }],
    next: { label: 'Compare the school profiles', href: '/compare/25Q525-vs-02M475' },
  },
];
export const getParentGuide = (slug: string) => PARENT_GUIDES.find(g => g.slug === slug);
export const parentGuidePath = (guide: Pick<ParentGuide, 'slug'>) => `/guides/${guide.slug}`;
