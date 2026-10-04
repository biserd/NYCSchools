/** Reviewed production D1 directory snapshot, October 3, 2026.
 * Program/grade-stage counts overlap: a canonical school can serve multiple stages.
 * Refresh these figures when the underlying directories are manually refreshed.
 */
export const PRICING_COVERAGE = {
  asOf: 'October 3, 2026',
  coreProfiles: 2408,
  privateProfiles: 623,
  earlyChildhoodCenters: 1885,
  accountSignupsFloor: 150,
  stages: [
    { label: '2-K programs', count: 615, href: '/map?source=twok&district=all', detail: 'For two-year-olds' },
    { label: '3-K programs', count: 965, href: '/program/3k', detail: 'For three-year-olds' },
    { label: 'Pre-K programs', count: 755, href: '/program/prek', detail: 'For four-year-olds' },
    { label: 'Elementary grades', count: 1051, href: '/nyc-schools/elementary-schools', detail: 'Serving K–5' },
    { label: 'Middle grades', count: 614, href: '/nyc-schools/middle-schools', detail: 'Serving grades 6–8' },
    { label: 'High school grades', count: 532, href: '/nyc-schools/high-schools', detail: 'Serving grades 9–12' },
  ],
} as const;

export const PRICING_DESCRIPTION = 'Family Premium is $9.99/month for deeper NYC school research, comparison, a family calendar, and a Parent Assistant on web and WhatsApp. KinderLearner for iPhone and iPad is coming soon.';
