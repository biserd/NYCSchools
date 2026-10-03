/** Shared by the browser and server: never invent a store listing or price. */
export const KINDERLEARNER = {
  launchUrl: '', // Set to the verified HTTPS App Store/onboarding URL when available.
  origin: 'https://nycschoolsratings.com',
  stylesheet: '/kinderlearner.css?v=2',
  availability: 'iPhone & iPad apps coming soon',
};

export function kinderLearnerStartHref(url = KINDERLEARNER.launchUrl): string {
  if (!url) return '#start-kinderlearner';
  try { const parsed = new URL(url); return parsed.protocol === 'https:' ? parsed.href : '#start-kinderlearner'; }
  catch { return '#start-kinderlearner'; }
}

export type KinderLearnerPage = 'home' | 'prek' | 'kindergarten';
export const KINDERLEARNER_PAGES = {
  home: {
    path: '/kinderlearner', label: 'KinderLearner', ages: 'Ages 3–6',
    title: 'KinderLearner | Personalized Pre-K & Kindergarten Learning App',
    description: 'KinderLearner is a personalized learning app for ages 3–6 that adapts reading, math, memory and reasoning activities to your child and gives parents practical ways to continue learning at home.',
    heading: 'Know how your child is learning. Know what to do next.',
  },
  prek: {
    path: '/kinderlearner/pre-k-learning-app', label: 'Pre-K learning', ages: 'Ages 3–5',
    title: 'Pre-K Learning App for Ages 3–5 | KinderLearner',
    description: 'KinderLearner is a personalized Pre-K learning app for ages 3–5 with playful reading, math, memory, reasoning and real-world activities that adapt as your child learns.',
    heading: 'A Smarter Pre-K Learning App for Ages 3–5',
  },
  kindergarten: {
    path: '/kinderlearner/kindergarten-learning-app', label: 'Kindergarten learning', ages: 'Ages 4–6',
    title: 'Kindergarten Learning App for Reading, Math & Thinking | KinderLearner',
    description: 'KinderLearner provides personalized Kindergarten practice in reading, phonics, math, memory and reasoning with adaptive activities and practical guidance for parents.',
    heading: 'Personalized Kindergarten Practice That Goes Beyond Worksheets',
  },
} as const;

export function getKinderLearnerPage(path: string): KinderLearnerPage | undefined {
  const clean = path.split(/[?#]/)[0].replace(/\/$/, '');
  return (Object.keys(KINDERLEARNER_PAGES) as KinderLearnerPage[]).find(key => KINDERLEARNER_PAGES[key].path === clean);
}

export const KL_FAQS: Record<KinderLearnerPage, {question: string; answer: string}[]> = {
  home: [
    {question: 'What age is KinderLearner for?', answer: 'KinderLearner is designed primarily for children ages 3–6, including Pre-K and Kindergarten learners.'},
    {question: 'Does KinderLearner replace school or tutoring?', answer: 'No. KinderLearner is designed to complement classroom learning and give families useful practice and guidance at home.'},
    {question: 'How does KinderLearner personalize learning?', answer: 'KinderLearner pays attention to what a child solves independently, where they need help, the difficulty of the activity and whether previously learned skills are remembered later.'},
    {question: 'How long should my child use KinderLearner?', answer: 'KinderLearner is designed around short, focused learning sessions rather than extended screen time.'},
    {question: 'Does KinderLearner include activities away from the screen?', answer: 'Yes. Real World Missions encourage children and parents to practice concepts using everyday objects, conversation and movement.'},
  ],
  prek: [
    {question: 'Is this Pre-K learning app suitable for a three-year-old?', answer: 'KinderLearner is designed for ages approximately 3–5 at the Pre-K stage. A grown-up can guide short sessions and choose real-world activities that fit their child’s interests and comfort.'},
    {question: 'Does my child need to know their letters first?', answer: 'No. Pre-K activities include listening, beginning sounds, quantities, shapes and patterns, alongside early letter recognition. Practice follows what your child demonstrates rather than assuming every child starts in the same place.'},
    {question: 'Does school readiness mean learning to read early?', answer: 'School readiness is broader than reading. Language, curiosity, number sense, attention, memory, emotions and independence all matter. KinderLearner is a practice companion, not an admissions test or a developmental assessment.'},
    {question: 'Can we practice without worksheets?', answer: 'Yes. Sound hunts, counting everyday objects and repeating clapping patterns turn familiar routines into parent-guided practice away from the screen.'},
  ],
  kindergarten: [
    {question: 'How does KinderLearner support Kindergarten practice at home?', answer: 'Short adventures reinforce reading, phonics, number sense, memory and reasoning. Parent guidance connects the skills being practiced with simple activities you can try together.'},
    {question: 'What if my child is confident in math but needs help with reading?', answer: 'KinderLearner follows individual skills rather than one overall level. Number practice and sound-blending practice can move at different paces.'},
    {question: 'What happens after a wrong answer?', answer: 'A child can receive a hint, see an idea visually or practice an easier version before returning to the challenge. The aim is useful support, not pressure to earn a score.'},
    {question: 'Does KinderLearner replace a teacher?', answer: 'No. It complements classroom learning with targeted practice at home. Speak with your child’s teacher about classroom expectations or concerns; KinderLearner does not diagnose learning or developmental conditions.'},
  ],
};

export function kinderLearnerSchemas(page: KinderLearnerPage): object[] {
  const meta = KINDERLEARNER_PAGES[page];
  const url = KINDERLEARNER.origin + meta.path;
  const crumbs = [{name:'NYC School Ratings', item:KINDERLEARNER.origin + '/'}, {name:'KinderLearner',item:KINDERLEARNER.origin + '/kinderlearner'}];
  if (page !== 'home') crumbs.push({name:meta.label,item:url});
  return [
    {'@context':'https://schema.org','@type':'SoftwareApplication','@id':KINDERLEARNER.origin + '/kinderlearner#app',name:'KinderLearner',applicationCategory:'EducationalApplication',url:KINDERLEARNER.origin + '/kinderlearner',description:KINDERLEARNER_PAGES.home.description,publisher:{'@type':'Organization',name:'NYC School Ratings',url:KINDERLEARNER.origin}},
    {'@context':'https://schema.org','@type':'BreadcrumbList',itemListElement:crumbs.map((crumb,i)=>({'@type':'ListItem',position:i+1,...crumb}))},
    {'@context':'https://schema.org','@type':'FAQPage',mainEntity:KL_FAQS[page].map(faq=>({'@type':'Question',name:faq.question,acceptedAnswer:{'@type':'Answer',text:faq.answer}}))},
  ];
}
