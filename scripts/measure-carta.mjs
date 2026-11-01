import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

// Timing measurements only: no screenshots, video, traces or visual assertions.
const target = process.argv[2] ?? 'http://127.0.0.1:4380/carta?mesa=1';
const url = new URL(target);
const profile = { downloadMbps: 1.6, uploadMbps: .75, latencyMs: 150, viewport: '390x844', coldCache: true };
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const samples = [];
  for (let index = 0; index < 3; index++) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
    const page = await context.newPage();
    await page.route('**/*', route => new URL(route.request().url()).origin === url.origin ? route.continue() : route.abort());
    const session = await context.newCDPSession(page);
    await session.send('Network.enable');
    await session.send('Network.setCacheDisabled', { cacheDisabled: true });
    await session.send('Network.emulateNetworkConditions', { offline: false, latency: profile.latencyMs, downloadThroughput: profile.downloadMbps * 1_000_000 / 8, uploadThroughput: profile.uploadMbps * 1_000_000 / 8 });
    await page.goto(target, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    samples.push(await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByName('first-contentful-paint')[0];
      return { firstContentfulPaintMs: paint?.startTime ?? null, domContentLoadedMs: navigation.domContentLoadedEventEnd, loadMs: navigation.loadEventEnd, products: document.querySelectorAll('[data-product-id]').length };
    }));
    await context.close();
  }
  const report = { target, profile, samples, note: 'Medición sintética en Edge sobre preview local. No representa un iPhone/Android real, CPU de teléfono, latencia del despliegue ni revisión visual.' };
  await writeFile('output/pdf/carta/timing-check.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
