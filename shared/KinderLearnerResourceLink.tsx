import React from 'react';
import { KINDERLEARNER_PAGES } from './kinderlearner';

/** Lightweight contextual link: existing school pages need not load the product UI. */
export function KinderLearnerResourceLink({stage='prek'}:{stage?:'prek'|'kindergarten'}) {
  return <aside className="my-8 rounded-xl border bg-muted/30 p-6"><p className="text-sm font-medium text-primary">Learning at home · KinderLearner</p><h2 className="mt-2 text-xl font-semibold">School search is one step. Learning together is another.</h2><p className="mt-2 text-muted-foreground">Explore parent-guided activities that build {stage==='prek'?'early language, counting and school-readiness foundations':'reading, number sense and confidence alongside Kindergarten'}.</p><a className="mt-3 inline-flex min-h-11 items-center text-primary underline" href={KINDERLEARNER_PAGES[stage].path}>Explore {stage==='prek'?'Pre-K learning':'Kindergarten practice at home'} →</a></aside>;
}
