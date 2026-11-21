import React from 'react';
import type { ClassroomCoverage,ClassroomTeaser } from './classroom-panel';
import { ClassroomPublicTakeaway } from './ClassroomPublicTakeaway';
import { SchoolPremiumGate } from './SchoolPremiumGate';

export function ClassroomPaywall({coverage,teaser,checkout}:{coverage:ClassroomCoverage;teaser:ClassroomTeaser;
  checkout?:{start:()=>void;pending:boolean}}) {
  const description=coverage.classSizes&&coverage.enrollment
    ? 'See the detailed classroom breakdowns, reported cap counts, and interactive enrollment charts for this school where available.'
    : coverage.classSizes
      ? 'See the numbers by grade, program, or course, with district comparisons where available.'
      : 'Explore the full enrollment charts and browse the figures by grade where reported.';
  return <div className="overflow-hidden rounded-xl border border-primary/25 bg-card" data-testid="classroom-panel-card">
    <ClassroomPublicTakeaway teaser={teaser} embedded/>
    <SchoolPremiumGate title="Get a closer look at this school" description={description} kind="cards" className="rounded-none border-t"
      testId="classroom-paywall" action={checkout?{onClick:checkout.start,pending:checkout.pending}:{href:'/pricing#checkout'}}/>
  </div>;
}
