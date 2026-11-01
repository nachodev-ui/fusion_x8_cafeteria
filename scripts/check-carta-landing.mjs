import { chromium, webkit, devices } from '@playwright/test';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

// Uses the production build served by `astro preview`; never takes screenshots.
const origin = new URL(process.argv[2] ?? 'http://127.0.0.1:4380').origin;
const proposals = JSON.parse(await readFile('output/pdf/carta/propuestas/manifest.json', 'utf8'));
const paths = [...new Set(['/carta', '/carta/', '/carta?mesa=12', ...proposals.files.map(file => { const url = new URL(file.url); return url.pathname + url.search; })])];
const checks = [];
const nextLayout = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
async function assertLanding(page, selector = '.carta-nav') {
  await page.waitForFunction(selector => {
    const nav = document.querySelector(selector);
    if (!nav) return false;
    const header = document.querySelector('[data-entry-header], .site-header');
    const position = header && getComputedStyle(header).position;
    const offset = header && ['fixed', 'sticky'].includes(position) ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
    return Math.abs(nav.getBoundingClientRect().top - offset) < 2;
  }, selector);
  return page.locator(selector).evaluate(element => ({ top: element.getBoundingClientRect().top, bottom: element.getBoundingClientRect().bottom, scrollY: window.scrollY }));
}
for (const [engine, launcher, options] of [
  ['Chromium / Android', chromium, { channel: 'msedge' }],
  ['WebKit / iPhone', webkit, {}],
]) {
  const browser = await launcher.launch({ ...options, headless: true });
  try {
    const context = await browser.newContext(engine.startsWith('WebKit') ? devices['iPhone 13'] : devices['Pixel 7']);
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      // Late fonts/logo exercise layout settlement in both browser engines.
      if (/\.(?:woff2?|png)$/.test(url.pathname)) await new Promise(resolve => setTimeout(resolve, 450));
      await route.continue();
    });
    for (const path of paths) {
      console.log(`Verificando ${engine}: ${path}`);
      const page = await context.newPage();
      await page.goto(origin + path, { waitUntil: 'domcontentloaded' });
      const first = await assertLanding(page);
      await page.waitForLoadState('load');
      await page.evaluate(() => document.fonts.ready);
      await nextLayout(page);
      const settled = await assertLanding(page);
      assert.ok(first.bottom < 160 && settled.bottom < 160);
      const expectedMesa = new URL(path, origin).searchParams.get('mesa');
      assert.equal(new URL(page.url()).searchParams.get('mesa'), expectedMesa);
      assert.equal(new URL(page.url()).hash, '');
      // Simulate a genuine late layout shift above the menu.
      await page.locator('.carta-intro').evaluate(element => { element.style.paddingTop = '170px'; });
      await nextLayout(page);
      await assertLanding(page);
      // Fixed-header height is measured; the navigation must remain below it.
      await page.locator('[data-entry-header]').evaluate(element => { element.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:72px;z-index:5;background:black;'; });
      await nextLayout(page);
      const fixed = await assertLanding(page);
      assert.ok(Math.abs(fixed.top - 72) < 2);
      // A visitor selecting a category is never dragged back on a subsequent resize.
      await page.getByRole('link', { name: 'Heladería', exact: true }).click();
      const chosenY = await page.evaluate(() => window.scrollY);
      await page.locator('.carta-intro').evaluate(element => { element.style.paddingTop = '190px'; });
      await nextLayout(page);
      const category = await page.locator('#heladeria').boundingBox();
      assert.ok(category.y >= 70 && category.y < 220, `La categoría debe seguir visible tras interactuar; y=${category.y}, scroll=${chosenY}`);
      checks.push({ engine, path, first, settled, fixedHeaderTop: fixed.top, queryPreserved: true, userNavigationRespected: true });
      await page.close();
    }
    for (const path of ['/#carta', '/']) {
      const page = await context.newPage();
      await page.goto(origin + path, { waitUntil: 'load' });
      if (path === '/') await page.getByRole('link', { name: 'Ver carta', exact: true }).click();
      const landing = await assertLanding(page, '.menu-toolbar');
      checks.push({ engine, path: path === '/' ? 'clic normal: Ver carta' : path, landing, headerDiscounted: true });
      await page.close();
    }
    await context.close();
  } finally { await browser.close(); }
}
await writeFile('output/pdf/carta/propuestas/landing-check.json', JSON.stringify({ origin, checks, engines: ['Chromium', 'WebKit'], lateResourcesMs: 450, physicalDevicesTested: false }, null, 2) + '\n');
console.log(`${checks.length} accesos comprobados en Chromium/Android y WebKit/iPhone emulados. Mesa conservada, categorías a la vista y cabecera fija compensada.`);
