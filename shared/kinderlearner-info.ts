import { KINDERLEARNER } from './kinderlearner';

export const KINDERLEARNER_INFO_PAGES = {
  privacy: { path: '/kinderlearner/privacy', title: 'KinderLearner Privacy Policy', description: 'How KinderLearner handles local learning progress, optional parent accounts, cloud sync, narration and data deletion.' },
  terms: { path: '/kinderlearner/terms', title: 'KinderLearner Terms of Use', description: 'Terms for KinderLearner learning activities, optional parent accounts, virtual rewards, the preview website and support.' },
  support: { path: '/kinderlearner/support', title: 'KinderLearner Support', description: 'Contact KinderLearner support, ask about the upcoming iPhone and iPad apps, and get help with privacy or data requests.' },
  deletion: { path: '/kinderlearner/delete-data', title: 'KinderLearner Data & Deletion Requests', description: 'How parents can contact KinderLearner about access, correction or deletion of their information.' },
} as const;
export type KinderLearnerInfoPage = keyof typeof KINDERLEARNER_INFO_PAGES;
export function getKinderLearnerInfoPage(path: string): KinderLearnerInfoPage | undefined {
  const clean = path.split(/[?#]/)[0].replace(/\/$/, '');
  return (Object.keys(KINDERLEARNER_INFO_PAGES) as KinderLearnerInfoPage[]).find(key => KINDERLEARNER_INFO_PAGES[key].path === clean);
}
export function kinderLearnerInfoSchemas(page: KinderLearnerInfoPage) {
  const meta = KINDERLEARNER_INFO_PAGES[page];
  return [
    { '@context': 'https://schema.org', '@type': 'WebPage', name: meta.title, description: meta.description, url: KINDERLEARNER.origin + meta.path },
    { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { name: 'NYC School Ratings', item: KINDERLEARNER.origin + '/' },
      { name: 'KinderLearner', item: KINDERLEARNER.origin + '/kinderlearner' },
      { name: meta.title, item: KINDERLEARNER.origin + meta.path },
    ].map((item, index) => ({ '@type': 'ListItem', position: index + 1, ...item })) },
  ];
}
