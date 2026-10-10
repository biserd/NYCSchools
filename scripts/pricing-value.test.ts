import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { FAMILY_PREMIUM } from '../shared/plans';
import { PRICING_COVERAGE, PRICING_DESCRIPTION } from '../shared/pricing-coverage';
import { PricingHero, PricingPlanFeatures } from '../shared/PricingValueContent';
import { renderSeoHtml } from '../server/seoRenderer';

const markup = [PricingHero, PricingPlanFeatures]
  .map(Component => renderToString(React.createElement(Component))).join('');
const base = readFileSync('client/index.html', 'utf8');
const html = await renderSeoHtml('/pricing', base);
const pageSource = readFileSync('client/src/pages/pricing.tsx', 'utf8');

assert.ok(html);
assert.equal((html.match(/<h1[ >]/g) || []).length, 1, 'pricing must have one server-rendered H1');
assert.ok(html.includes('id="checkout"'), 'checkout needs a server-rendered section');
assert.ok(html.includes('href="https://nycschoolsratings.com/pricing"'));
assert.ok(html.includes(PRICING_DESCRIPTION.replaceAll('&', '&amp;')));
assert.equal(FAMILY_PREMIUM.amount, 999, 'visible price must match checkout plan');
assert.ok(html.includes('$9.99'));
assert.ok(pageSource.includes('data-testid="button-family-checkout"'));
assert.equal((pageSource.match(/data-testid="button-family-checkout"/g) || []).length, 1);
assert.ok(markup.includes('2,408'));
for (const value of ['615', '965', '755', '1,051', '614', '532', '623', '1,885']) {
  assert.ok(markup.includes(value), `feature checklist must include ${value}`);
  assert.ok(html.includes(value), `server-rendered checklist must include ${value}`);
}
assert.ok(markup.includes('Family Premium features'));
assert.ok(markup.includes('Coming soon on iPhone (iOS) and iPad'));
assert.ok(markup.includes('KinderLearner for members'));
assert.ok(!markup.includes('KinderLearner is available now'));
assert.ok(!/also planned|not available today/i.test(`${markup} ${html} ${pageSource}`));
assert.ok(!markup.includes('160+ NYC families'));
assert.ok(!markup.includes('A broader view of NYC schools'));
assert.ok(!html.includes('A broader view of NYC schools'));
assert.ok(!/no free trial/i.test(`${markup} ${html} ${pageSource}`));
for (const path of [
  'client/src/components/ChatBot.tsx',
  'client/src/components/UpgradeModal.tsx',
  'client/src/pages/benefits.tsx',
  'client/src/pages/compare.tsx',
  'client/src/pages/developers-docs.tsx',
  'client/src/pages/recommendations.tsx',
  'client/src/pages/terms.tsx',
  'server/emailService.ts',
  'server/parent/checkout.ts',
]) {
  assert.ok(!/no free trial/i.test(readFileSync(path, 'utf8')), `${path} must not use that phrase`);
}
for (const removed of ['Explore school guides', 'What your membership changes', 'Already a paying customer? Your plan stays intact.', 'Explore My Family', 'Preview KinderLearner']) {
  assert.ok(!`${markup} ${html} ${pageSource}`.includes(removed), `${removed} should not be on the pricing page`);
}
assert.equal(PRICING_COVERAGE.stages.length, 6);
assert.equal(PRICING_COVERAGE.stages.find(stage => stage.label === '2-K programs')?.count, 615);
assert.ok(markup.includes('Program and grade counts overlap'));
console.log('Pricing value, verified coverage copy, plan price and SSR passed');
