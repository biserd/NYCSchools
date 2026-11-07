import React from 'react';

export function MiddleSchoolNextSteps({ placement }: { placement: 'intro' | 'shortlist' }) {
  return <section className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4" aria-label={`Middle-school planning: ${placement}`}>
    <h2 className="text-2xl font-semibold">{placement === 'intro' ? 'Build your middle-school shortlist' : 'Take your shortlist to the next step'}</h2>
    <p>Choose two or three schools with realistic eligibility and travel. Compare the same-year evidence below, then check each program’s current priorities in MySchools.</p>
    <div className="grid sm:grid-cols-3 gap-4">
      <div className="space-y-2"><a className="inline-block rounded-md bg-primary text-primary-foreground px-4 py-3 font-semibold" href="/recommendations" data-guide-action="shortlist" data-guide-placement={placement}>Find schools that fit</a><p className="text-sm">Start with your child’s grade, location and family priorities.</p></div>
      <div className="space-y-2"><a className="inline-block border border-primary rounded-md text-primary px-4 py-3 font-semibold" href="/compare" data-guide-action="compare" data-guide-placement={placement}>Compare your options</a><p className="text-sm">Search for schools and compare profiles side by side.</p></div>
      <div className="space-y-2"><a className="inline-block border border-primary rounded-md text-primary px-4 py-3 font-semibold" href="/family" data-guide-action="reminders" data-guide-placement={placement}>Plan visits & reminders</a><p className="text-sm">Add verified visits and deadlines in Family & Reminders. Sign-in and plan requirements apply; reminders require opt-in.</p></div>
    </div>
    {placement === 'shortlist' && <p className="text-sm"><a className="text-primary underline" href="/favorites" data-guide-action="saved_schools" data-guide-placement={placement}>Open your saved schools</a> · <a className="text-primary underline" href="/map?district=all">Check locations on the map</a></p>}
  </section>;
}
