export const CHATGPT_PLUGIN = {
  path: '/chatgpt',
  url: 'https://chatgpt.com/plugins/plugin_asdk_app_69442a811a748191a2a59383a0b7905c',
  title: 'NYC School Ratings ChatGPT Plugin | Find & Compare Schools',
  description: 'Find and compare NYC schools in ChatGPT with NYC School Ratings. Search by district, borough, grade and recorded programs, with source years and profile links.',
  reviewed: '2026-11-07',
} as const;

export const CHATGPT_PROMPTS = [
  { label: 'Build a District 2 shortlist', prompt: 'Use NYC School Ratings to find public elementary schools in District 2. Include profile links, grade ranges, available ratings and data years. Explain what is missing.' },
  { label: 'Explore Queens early-years programs', prompt: 'Use NYC School Ratings to find providers in Queens with recorded 2-K, 3-K or pre-K programs. Separate the programs and explain what the data does not establish about current seats or eligibility.' },
  { label: 'Understand one school', prompt: 'What does NYC School Ratings report for school 02M422? Separate your independent rating from official measures, and include sources, reporting years and missing-data caveats.' },
  { label: 'Compare the tradeoffs', prompt: 'Compare NYC schools 02M422 and 15K516 with NYC School Ratings. Explain their different grade ranges, compare only relevant available measures, and include profile links rather than declaring a single winner.' },
] as const;

export const CHATGPT_FAQS = [
  { question: 'Do I need a NYC School Ratings subscription?', answer: 'No NYC School Ratings account or subscription is required for the plugin’s public school research tools. You need access to ChatGPT and the plugin. ChatGPT and your workspace determine installation and availability.' },
  { question: 'Can it tell me which school is best?', answer: 'It can help compare available measures and explain tradeoffs. The right choice also depends on your child’s grade, programs, commute and priorities. NYC School Ratings scores are independent comparison scores, not official NYCPS ratings or admissions decisions.' },
  { question: 'Does a listed 2-K, 3-K or pre-K program have open seats?', answer: 'Not necessarily. Recorded program availability does not establish live vacancies, eligibility, admissions odds or placement. Confirm current information with NYC Public Schools and the provider. Early-childhood-only providers do not receive K–12 academic scores.' },
  { question: 'Can the plugin access my family calendar or payment details?', answer: 'No. This plugin provides public, read-only school research. It cannot access subscriber accounts, family calendars, private messages or billing, change ratings, or enroll a child. Family Premium features are separate, signed-in website and WhatsApp services.' },
  { question: 'Where does the information come from?', answer: 'The tools use the website’s canonical school records, with source links, reporting years and missing-data notes where available. Measures can come from different reporting periods. A missing result is not a zero score or a judgment of school quality.' },
] as const;

export function chatgptPluginSchemas() {
  const url = 'https://nycschoolsratings.com' + CHATGPT_PLUGIN.path;
  return [
    { '@context':'https://schema.org', '@type':'WebPage', name:CHATGPT_PLUGIN.title, description:CHATGPT_PLUGIN.description, url, dateModified:CHATGPT_PLUGIN.reviewed },
    { '@context':'https://schema.org', '@type':'BreadcrumbList', itemListElement:[
      { '@type':'ListItem', position:1, name:'NYC School Ratings', item:'https://nycschoolsratings.com/' },
      { '@type':'ListItem', position:2, name:'ChatGPT plugin', item:url },
    ] },
    { '@context':'https://schema.org', '@type':'FAQPage', mainEntity:CHATGPT_FAQS.map(faq=>({ '@type':'Question', name:faq.question, acceptedAnswer:{ '@type':'Answer', text:faq.answer } })) },
  ];
}
