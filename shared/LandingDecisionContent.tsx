import React from 'react';
import type { School } from './schema';
import type { SeoLanding } from './seo-landings';
import { GeographicDecisionContent } from './GeographicDecisionContent';
import { LanguageDecisionContent } from './LanguageDecisionContent';

const PILOT = new Set(['district:2', 'neighborhood:upper-east-side', 'neighborhood:upper-west-side', 'neighborhood:park-slope']);
export function LandingDecisionContent({ landing, schools, ready = true }: { landing: SeoLanding; schools: School[]; ready?: boolean }) {
  if (PILOT.has(`${landing.kind}:${landing.slug}`)) return <GeographicDecisionContent landing={landing} schools={schools} ready={ready}/>;
  if (['dual', 'spanish', 'mandarin'].includes(landing.program ?? '')) return <LanguageDecisionContent landing={landing} schools={schools} ready={ready}/>;
  if (['3k', 'prek'].includes(landing.program ?? '')) return <section className="rounded-xl border bg-primary/5 p-5 my-8"><h2 className="text-xl font-semibold mb-3">Looking for 3-K, pre-K and kindergarten at one school?</h2><p className="mb-3">Program overlap is different from automatic progression. Compare independent program flags on a single school record and check whether kindergarten is actually offered.</p><a className="text-primary underline" href="/guides/2k-3k-prek-kindergarten-same-school">See the early-years continuity comparison and recorded overlaps</a></section>;
  return null;
}
