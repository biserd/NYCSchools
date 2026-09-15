import React from 'react';
import { getBlogPost } from './blog-data';

// Editorial, reciprocal links: connect complementary evidence, not rankings to survey scores.
const connections: [string, string, string][] = [
  ['nyc-school-survey-2026','2023-24-doe-data-analysis','Compare community feedback with the older academic data, keeping reporting years separate.'],
  ['nyc-family-survey-2026','best-nyc-elementary-schools-2026','Use family feedback to add communication and trust questions to an elementary-school shortlist.'],
  ['nyc-family-survey-2026','best-nyc-charter-schools-2026','Look beyond a ranking when comparing family experience at charter schools.'],
  ['nyc-teacher-survey-2026','nyc-schools-2025-covid-recovery','Read teacher working conditions alongside academic recovery, without assuming one caused the other.'],
  ['nyc-student-survey-2026','best-nyc-middle-schools-2026','Add student support and belonging to your middle-school research.'],
  ['nyc-student-survey-2026','top-nyc-schools-high-crime-neighborhoods-2026','Distinguish students’ experience inside school from neighborhood crime statistics.'],
  ['survey-methodology','does-crime-predict-nyc-school-quality-data-analysis-2026','See why survey experience, academic outcomes and neighborhood safety are different measures.'],
  ['nyc-early-childhood-survey-2026','nyc-prek-3k-kindergarten-admissions-demand-2025','Combine center experience with admissions context; survey scores do not indicate available seats.'],
  ['nyc-early-childhood-survey-2026','best-nyc-kindergartens-2026','Plan the transition to kindergarten without treating Birth-to-5 feedback as a K–12 academic rating.'],
  ['nys-test-results-2026','nyc-schools-2025-covid-recovery','Understand the existing assessment baseline while waiting for final school-level results.'],
];

export function relatedBlogLinks(slug: string) {
  return connections.filter(([a,b])=>a===slug||b===slug).map(([a,b,context])=>({post:getBlogPost(a===slug?b:a)!,context}));
}

export function RelatedBlogReading({slug}: {slug:string}) {
  const links=relatedBlogLinks(slug);
  if (!links.length) return null;
  return <section className="my-10 border-t pt-8" aria-label="Related blog reading"><h2 className="text-2xl font-bold mb-4">Put the findings in context</h2><ul className="space-y-5">{links.map(({post,context})=><li key={post.slug}><a className="font-semibold underline underline-offset-4" href={`/blog/${post.slug}`}>{post.title}</a><p className="text-sm text-muted-foreground mt-2 leading-7">{context}</p></li>)}</ul></section>;
}
