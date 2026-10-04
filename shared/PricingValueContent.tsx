import React from 'react';
import { Check } from 'lucide-react';
import { PRICING_COVERAGE } from './pricing-coverage';

const count = (value: number) => value.toLocaleString('en-US');

export function PricingHero() {
  return <header className="relative overflow-hidden rounded-3xl border border-blue-800 bg-gradient-to-br from-slate-950 via-blue-950 to-sky-800 px-6 py-8 text-white shadow-lg md:px-10 md:py-10">
    <div className="relative z-10 max-w-2xl space-y-3">
      <p className="text-sm font-semibold uppercase tracking-widest text-sky-200">Family Premium</p>
      <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">Find the right school. Stay on top of family life.</h1>
      <p className="text-lg leading-relaxed text-blue-100">One membership for NYC school research, your family calendar, and a Parent Assistant on web and WhatsApp.</p>
    </div>
    <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border border-white/15 bg-sky-400/10" aria-hidden="true" />
    <div className="pointer-events-none absolute -bottom-32 right-24 h-64 w-64 rounded-full border border-white/10 bg-blue-300/10" aria-hidden="true" />
  </header>;
}

export function PricingPlanFeatures() {
  const stages = PRICING_COVERAGE.stages;
  const stageCount = (label: string) => count(stages.find(stage => stage.label === label)!.count);
  const features = [
    { title: `${count(PRICING_COVERAGE.coreProfiles)} core school and 2-K provider profiles`, detail: `${stageCount('2-K programs')} 2-K · ${stageCount('3-K programs')} 3-K · ${stageCount('Pre-K programs')} pre-K programs` },
    { title: 'Schools from kindergarten through high school', detail: `${stageCount('Elementary grades')} elementary · ${stageCount('Middle grades')} middle · ${stageCount('High school grades')} high school` },
    { title: 'Additional directories', detail: `${count(PRICING_COVERAGE.privateProfiles)} private-school · ${count(PRICING_COVERAGE.earlyChildhoodCenters)} early-childhood center profiles` },
    { title: 'Research and compare', detail: 'Full profiles, surveys, trends, commute tools, favorites and application tracking.' },
    { title: 'Plan your family’s year', detail: 'NYCPS calendar dates, your own events and opted-in reminders.' },
    { title: 'Parent Assistant on web and WhatsApp', detail: 'Up to 30 requests a day and 100 WhatsApp reminders a month.' },
    { title: 'KinderLearner for members', detail: 'Coming soon on iPhone (iOS) and iPad.', planned: true },
  ];
  return <div className="space-y-3">
    <ul className="space-y-3" aria-label="Family Premium features">{features.map(feature => <li className="flex gap-2" key={feature.title}>
      <Check className="mt-0.5 h-5 w-5 shrink-0 text-blue-700 dark:text-sky-300" aria-hidden="true" />
      <span><span className="font-medium">{feature.title}</span>{feature.planned && <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 dark:bg-blue-900 dark:text-sky-200">Coming soon</span>}{feature.detail && <span className="block text-sm text-muted-foreground">{feature.detail}</span>}</span>
    </li>)}</ul>
    <p className="text-xs text-muted-foreground">Directory snapshot: {PRICING_COVERAGE.asOf}. Program and grade counts overlap; private and early-childhood directories are separate.</p>
  </div>;
}
