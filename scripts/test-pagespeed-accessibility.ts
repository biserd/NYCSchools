import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { llmsText } from '../server/llmsContent';

// tsx uses the classic transform; Vite uses the automatic React transform.
Object.assign(globalThis, { React });
const { FilterBar } = await import('../client/src/components/FilterBar');
const { FavoriteButton } = await import('../client/src/components/FavoriteButton');
const { ComparisonProvider, useComparison } = await import('../client/src/contexts/ComparisonContext');
const noop = () => {};
const filters = renderToStaticMarkup(React.createElement(FilterBar, {
  searchQuery: '', onSearchChange: noop, selectedDistrict: 'all', onDistrictChange: noop,
  selectedGradeBand: 'All', onGradeBandChange: noop, sortBy: 'overall', onSortChange: noop,
  onEarlyChildhoodFilterChange: noop, onGiftedTalentedFilterChange: noop,
  onTrendFilterChange: noop, onDualLanguageFilterChange: noop, onPtaFilterChange: noop,
  onIepFilterChange: noop, onZipCodeChange: noop, onZonedFilterChange: noop, hasZonedSchools: true,
}));
const combos = filters.match(/<button\b[^>]*role="combobox"[^>]*>/g) || [];
assert.equal(combos.length, 9);
for (const combo of combos) assert.match(combo, /aria-label="Filter by [^"]+"/);
assert.match(filters, /aria-label="Search schools"/);
assert.match(filters, /aria-label="Filter by ZIP code"/);

const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
const render = (child: React.ReactElement) => renderToStaticMarkup(
  React.createElement(QueryClientProvider, { client }, child));
client.setQueryData(['/api/auth/user'], null);
assert.match(render(React.createElement(FavoriteButton, { schoolDbn: '02M422' })), /aria-label="Log in to save school 02M422"/);
client.setQueryData(['/api/auth/user'], { id: 'test-user' });
for (const saved of [false, true]) {
  client.setQueryData(['/api/favorites/check', '02M422'], { isFavorite: saved });
  const markup = render(React.createElement(FavoriteButton, { schoolDbn: '02M422' }));
  assert.match(markup, /aria-label="Save school 02M422"/);
  assert.ok(markup.includes(`aria-pressed="${saved}"`));
}
let comparison: ReturnType<typeof useComparison>;
function Probe() { comparison = useComparison(); return null; }
client.setQueryData(['/api/subscription-status'], { isSubscribed: true });
render(React.createElement(ComparisonProvider, { children: React.createElement(Probe) }));
assert.equal(comparison!.maxCompare, 4);
client.setQueryData(['/api/auth/user'], null);
render(React.createElement(ComparisonProvider, { children: React.createElement(Probe) }));
assert.equal(comparison!.maxCompare, 2, 'cached paid status must not grant anonymous premium');
assert.equal(client.getQueryCache().find({ queryKey: ['/api/subscription-status'] })?.options.enabled, false);
client.clear();

for (const full of [false, true]) {
  const text = llmsText(full);
  assert.match(text, /^# NYC School Ratings\n/);
  const links = [...text.matchAll(/\[[^\]\n]+\]\((https:\/\/[^\s)]+)\)/g)];
  assert.ok(links.length >= 11);
  for (const link of links) assert.equal(new URL(link[1]).protocol, 'https:');
  assert.doesNotMatch(text, /^- [^\n]*: https?:/m, 'resource entries must use Markdown links');
  assert.match(text, /Private calendars, messaging, and billing are not exposed/);
}
assert.doesNotMatch(readFileSync('client/index.html', 'utf8'), /maximum-scale=1|user-scalable=no/);
const analyticsScript = [...readFileSync('client/index.html', 'utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).find(script => script.includes('var __loadGa'))!;
for (const hostname of ['nycschoolsratings.com', 'www.nycschoolsratings.com', 'nyc-schools-ratings-d1-staging.biser-d.workers.dev', 'localhost']) {
  const scripts: Array<{src?: string}> = [];
  const context: any = {
    dataLayer: [], location: { hostname },
    document: { createElement: () => ({}), head: { appendChild: (script: {src?: string}) => scripts.push(script) } },
    setTimeout: (callback: () => void) => callback(),
  };
  context.window = context;
  runInNewContext(analyticsScript, context);
  assert.equal(scripts.length, hostname === 'nycschoolsratings.com' || hostname === 'www.nycschoolsratings.com' ? 1 : 0, hostname);
}
// Check the light-theme primary token both as button fill and tinted-badge text.
const css = readFileSync('client/src/index.css', 'utf8');
const primary = css.match(/--primary:\s*([\d.]+) ([\d.]+)% ([\d.]+)%/)!;
const [h, s, l] = [Number(primary[1]), Number(primary[2]) / 100, Number(primary[3]) / 100];
const a = s * Math.min(l, 1 - l);
const rgb = [0, 8, 4].map(n => {
  const k = (n + h / 30) % 12;
  return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
});
const luminance = (color: number[]) => color.map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4)
  .reduce((sum, c, i) => sum + c * [.2126, .7152, .0722][i], 0);
const ratio = (front: number[], back: number[]) => {
  const values = [luminance(front), luminance(back)].sort((a, b) => b - a);
  return (values[0] + .05) / (values[1] + .05);
};
assert.ok(ratio(rgb, [1, 1, 1]) >= 4.5, 'white button text');
assert.ok(ratio(rgb, rgb.map(c => c * .1 + .98 * .9)) >= 4.5, 'tinted commute badge');
console.log('PASS: named filters/favorites, comparison entitlements, zoom, contrast and linked llms feeds');
