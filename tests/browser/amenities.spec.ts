import { test, expect } from '@playwright/test';
import { business } from '../../src/data/business';

test('comodidades muestran las cuatro escenas y el contenido existente en una composición de escritorio', async ({ page }) => {
  await page.route('https://**/*', route => route.abort());
  await page.setViewportSize({ width: 1280, height: 850 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const section = page.locator('#comodidades');
  await expect(section.getByRole('heading', { level: 2 })).toHaveText('Tu gente, tu mascota y un buen momento.');
  await expect(section.locator('[data-comfort-card]')).toHaveCount(4);
  for (const item of business.amenities) {
    await expect(section.getByRole('heading', { name: item.title, exact: true })).toBeVisible();
    await expect(section).toContainText(item.description);
  }
  await expect(section.locator('.amenity-icon')).toHaveCount(0);
  await expect(section.locator('img')).toHaveCount(4);
  for (const img of await section.locator('img').all()) {
    await expect(img).toHaveAttribute('src', /^\/.*(?:\.webp|f=webp)/);
    await expect(img).toHaveAttribute('loading', 'lazy');
    await expect(img).toHaveAttribute('alt', '');
  }
  await expect(section.locator('[data-comfort-controls]')).toBeHidden();
  const pet = (await section.locator('.comfort-card--pet').boundingBox())!;
  const terrace = (await section.locator('.comfort-card--terrace').boundingBox())!;
  const winter = (await section.locator('.comfort-card--winter').boundingBox())!;
  expect(pet.height).toBeGreaterThan(terrace.height * 1.8);
  expect(terrace.width).toBeGreaterThan(winter.width * 1.8);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('carrusel móvil permite recorrer las cuatro comodidades, volver y navegar con teclado', async ({ page }) => {
  await page.route('https://**/*', route => route.abort());
  await page.setViewportSize({ width: 390, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const section = page.locator('#comodidades');
  const track = section.locator('[data-comfort-track]');
  const previous = section.getByRole('button', { name: 'Ver comodidad anterior' });
  const next = section.getByRole('button', { name: 'Ver siguiente comodidad' });
  const count = section.locator('[data-comfort-count]');
  await expect(previous).toBeDisabled();
  await expect(next).toBeEnabled();
  await expect(count).toHaveText('01 / 04');
  for (const label of ['02 / 04', '03 / 04', '04 / 04']) {
    await next.click();
    await expect(count).toHaveText(label);
  }
  await expect(next).toBeDisabled();
  await previous.click();
  await expect(count).toHaveText('03 / 04');
  await track.focus();
  await page.keyboard.press('Home');
  await expect(count).toHaveText('01 / 04');
  await page.keyboard.press('End');
  await expect(count).toHaveText('04 / 04');
  const transform = await section.locator('.comfort-image').first().evaluate(element => getComputedStyle(element).transform);
  expect(transform).toBe('none');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});

test('sin JavaScript se mantienen las imágenes, los textos y el desplazamiento nativo', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 800 } });
  const page = await context.newPage();
  await page.route('https://**/*', route => route.abort());
  await page.goto('http://127.0.0.1:4378/');
  const section = page.locator('#comodidades');
  await expect(section.locator('[data-comfort-card]')).toHaveCount(4);
  await expect(section.locator('[data-comfort-controls]')).toBeHidden();
  const overflowing = await section.locator('[data-comfort-track]').evaluate(element => element.scrollWidth > element.clientWidth);
  expect(overflowing).toBe(true);
  for (const item of business.amenities) await expect(section).toContainText(item.title);
  await context.close();
});
