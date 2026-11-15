export const KINDERGARTEN_APPS_SLUG = 'best-kindergarten-learning-apps';
export const KINDERGARTEN_APPS_REVIEW_DATE = '2026-11-14';

export const KINDERGARTEN_APPS_POST = {
  slug: KINDERGARTEN_APPS_SLUG,
  title: '7 Best Kindergarten Learning Apps',
  description: 'Compare seven kindergarten learning apps for phonics, reading, and math. See what’s free, what to try first, and which apps work on iPad, Android, or the web.',
  author: 'Biser Dimitrov',
  authorType: 'Person',
  publishedAt: KINDERGARTEN_APPS_REVIEW_DATE,
  readTime: '7 min read',
  category: 'Parent Guide',
  tags: ['Kindergarten', 'Learning Apps', 'Parent Guide', 'Phonics', 'Early Math'],
} as const;

export const KINDERLEARNER_APP_STORE = 'https://apps.apple.com/us/app/kinderlearner-phonics-math/id6816259828';
export const KINDERLEARNER_MATH_SAMPLE = 'https://kinderlearner.com/games/math-games-for-5-year-olds/';
export const KINDERLEARNER_SOUNDS_SAMPLE = 'https://kinderlearner.com/games/beginning-sounds/';

export const KINDERGARTEN_APP_PICKS = [
  {
    id: 'kinderlearner',
    name: 'KinderLearner',
    bestFor: 'Short phonics and math practice with one next step for parents',
    devices: 'Web, iPhone, iPad',
    price: 'Free browser samples. A free parent account includes one child profile and three daily Word + Number activities. Optional Family plan: $4.99/month or $49.99/year.',
    sources: [['Plans', 'https://kinderlearner.com/#plans'], ['App Store', KINDERLEARNER_APP_STORE]],
  },
  {
    id: 'khan-academy-kids',
    name: 'Khan Academy Kids',
    bestFor: 'A broad, completely free library for reading, math, and more',
    devices: 'iPhone, iPad, Android, Fire, compatible Chromebooks',
    price: 'Free for families, with no ads or in-app purchases.',
    sources: [['Family access', 'https://www.khanacademy.org/kids/pricing']],
  },
  {
    id: 'duolingo-abc',
    name: 'Duolingo ABC',
    bestFor: 'Free phonics, sounding out words, and early reading',
    devices: 'iPhone, iPad, Android',
    price: 'Free. It focuses on literacy rather than math.',
    sources: [['Official app page', 'https://abc.duolingo.com/']],
  },
  {
    id: 'starfall',
    name: 'Starfall',
    bestFor: 'Browser-based phonics, songs, and early math',
    devices: 'Web, iPhone, iPad, Android',
    price: 'Free learn-to-read content. The $35/year Home Membership sold on the web unlocks more activities.',
    sources: [['Starfall', 'https://www.starfall.com/'], ['Home Membership', 'https://secure.starfall.com/lv/ways-to-join?session-expired=1']],
  },
  {
    id: 'abcmouse',
    name: 'ABCmouse',
    bestFor: 'A structured path through reading, math, science, and art',
    devices: 'Desktop web, iPhone, iPad, Android, Fire',
    price: 'Free Basic Access: up to 10 curated activities a day. Premium: $14.99/month or $79.99/year on the web. Annual app-store pricing differs.',
    sources: [['Free access and pricing', 'https://support.abcmouse.com/hc/en-us/articles/34386182204311-ABCmouse-Free-Access-Here-s-What-You-Need-to-Know'], ['Devices', 'https://support.abcmouse.com/hc/en-us/articles/34386909963799-Devices-You-Can-Use-with-ABCmouse']],
  },
  {
    id: 'splashlearn',
    name: 'SplashLearn',
    bestFor: 'Grade-level math games and printable activities',
    devices: 'Web, iPhone, iPad, Android',
    price: 'Teacher-assigned practice is free. For full home access the provider advertises plans from $7.49/month when billed annually.',
    sources: [['Family pricing', 'https://www.splashlearn.com/'], ['Kindergarten resources', 'https://www.splashlearn.com/kindergarteners']],
  },
  {
    id: 'teach-your-monster-to-read',
    name: 'Teach Your Monster to Read',
    bestFor: 'A game that moves from letter sounds to blending and reading',
    devices: 'Desktop web, iPhone, iPad, Android',
    price: 'Free on computers with an account. The U.S. iPhone/iPad version was $8.99 when checked. A subscription-based mobile update for new users has been announced.',
    sources: [['Web game', 'https://www.teachyourmonster.org/teach-your-monster-to-read/'], ['App Store', 'https://apps.apple.com/us/app/teach-your-monster-to-read/id828392046'], ['Pricing change', 'https://www.teachyourmonster.org/monster-news/important-update-changes-to-teach-your-monster-to-read/']],
  },
] as const;
