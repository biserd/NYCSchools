import React from 'react';
import {DATA_RELEASE} from './data-release';
export function DataReleaseNotice({placement}:{placement:'homepage'|'blog'|'results'}) {
  return <p className="text-sm leading-7 text-muted-foreground" data-testid="data-release-notice"><span className="font-semibold text-foreground">2026 school results are available.</span>{' '}<a href={DATA_RELEASE.path} className="text-primary underline underline-offset-4 inline-flex min-h-11 items-center" data-release-action="announcement" data-release-placement={placement}>Explore the analysis and free data downloads →</a></p>;
}
