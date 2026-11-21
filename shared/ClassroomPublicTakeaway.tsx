import React from 'react';
import { CITY_CAP_SOURCE,CITY_CLASS_SOURCE } from './city-class-size';
import { REGISTER_SOURCE } from './classroomPilot';
import type { ClassroomTeaser } from './classroom-panel';

const sources={
  enrollment:[REGISTER_SOURCE,'NYCPS enrollment register'],
  classes:[CITY_CLASS_SOURCE,'NYCPS class-size reports'],
  caps:[CITY_CAP_SOURCE,'NYCPS compliance report'],
} as const;

export function ClassroomPublicTakeaway({teaser,embedded=false}:{teaser:ClassroomTeaser;embedded?:boolean}){
  const [url,label]=sources[teaser.source];
  return <div className={`bg-primary/5 p-4 sm:p-5${embedded?'':' rounded-xl border border-primary/25'}`} data-testid="classroom-public-takeaway">
    <p className="text-xs font-semibold uppercase tracking-wide text-primary">What this means for your family</p>
    <h3 className="mt-1 text-xl font-bold">{teaser.headline}</h3>
    <p className="mt-2 max-w-3xl text-sm">{teaser.detail}</p>
    <a className="mt-2 inline-block text-xs text-primary underline" href={url} target="_blank" rel="nofollow noopener noreferrer">{label}</a>
  </div>;
}
