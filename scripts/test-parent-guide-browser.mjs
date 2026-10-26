import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const modulePath = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(modulePath ? pathToFileURL(modulePath).href : 'playwright');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const base = process.env.GUIDE_PREVIEW_URL || 'http://127.0.0.1:8797';
const slugs = ['nyc-school-district-map-and-zones', 'private-elementary-schools-nyc', '2k-3k-prek-kindergarten-same-school', 'ps6-vs-ps290', 'townsend-harris-vs-stuyvesant'];
await mkdir('artifacts/parent-guides', { recursive: true });
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    // This is a local UI test, not a production analytics session.
    await context.route('**/*', route => new URL(route.request().url()).origin === new URL(base).origin ? route.continue() : route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    for (const slug of slugs) {
      await page.goto(`${base}/guides/${slug}`, { waitUntil: 'networkidle' });
      await page.getByRole('heading', { name: 'Sources and data limits' }).waitFor();
      assert.equal(await page.locator('h1').count(), 1, `${slug}: one h1`);
      assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), `https://nycschoolsratings.com/guides/${slug}`);
      assert.ok((await page.title()).length > 20);
      assert.ok(await page.getByRole('table').count() >= 1);
      assert.ok(!await page.getByText('School data is temporarily unavailable.', { exact: false }).count());
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      assert.equal(overflow, false, `${slug}: no document overflow at ${width}`);
      if (slug !== slugs[0]) assert.ok(await page.locator('a[href^="/school/"], a[href^="/private-school/"]').count() > 0);
      await page.screenshot({ path: `artifacts/parent-guides/${slug}-${width}.png`, fullPage: true });
      if (slug === '2k-3k-prek-kindergarten-same-school') {
        await page.getByLabel('Program combination or borough').selectOption('all-four');
        await page.getByText('No recorded matches for these filters.', {exact:false}).waitFor();
        await page.getByLabel('Program combination or borough').selectOption('3k-prek');
        assert.ok(await page.locator('a[href^="/school/"]').count()>0);
        await page.getByRole('button',{name:'Next',exact:true}).click();
        await page.getByText('Page 2 of', {exact:false}).waitFor();
      }
      if(slug==='private-elementary-schools-nyc') {
        await page.getByLabel('Program combination or borough').selectOption('Queens');
        assert.ok(await page.locator('a[href^="/private-school/"]').count()>0);
        await page.getByLabel('School name or identifier').fill('zzzz-no-match');
        await page.getByText('No recorded matches for these filters.', {exact:false}).waitFor();
      }
      console.log(`PASS ${width}px ${slug}`);
    }
    for(const stage of ['elementary','middle']) {
      await page.goto(`${base}/blog/best-nyc-${stage}-schools-2026`,{waitUntil:'networkidle'});
      await page.getByRole('heading',{name:'How this shortlist is built'}).waitFor();
      assert.ok(await page.getByRole('table').count()>0);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false);
      assert.equal(await page.getByText('Zoned (Unscreened)',{exact:true}).count(),0);
      await page.screenshot({path:`artifacts/parent-guides/ranking-${stage}-${width}.png`,fullPage:true});
      console.log(`PASS ${width}px ranking ${stage}`);
    }
    await page.goto(base+'/map',{waitUntil:'networkidle'});
    await page.getByRole('heading',{name:'NYC School Map — All Districts'}).waitFor();
    assert.equal(await page.getByRole('navigation',{name:'Browse school districts by borough'}).locator('a').count(),32);
    assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'),'https://nycschoolsratings.com/map');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1),false);
    console.log(`PASS ${width}px map citywide default`);
    // Existing pilot URLs use the same new analysis on the actual built client.
    for (const path of ['/district/2', '/neighborhood/upper-east-side', '/neighborhood/upper-west-side', '/neighborhood/park-slope', '/program/mandarin-dual-language', '/program/spanish-dual-language']) {
      await page.goto(base + path, { waitUntil: 'networkidle' });
      await page.getByRole('region', { name: 'Guide analysis' }).waitFor();
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), false, path);
      console.log(`PASS ${width}px ${path}`);
    }
    assert.deepEqual(errors, [], 'No JavaScript runtime errors');
    await context.close();
  }
} finally { await browser.close(); }
