import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseMenu, dietaryTagLabels } from '../../src/data/menu-schema';
import { formatPrice } from '../../src/data/menu-format';

const products = parseMenu(JSON.parse(readFileSync('src/data/products.json', 'utf8'))).products;
test('carta pública sin sesión ni servicios externos, con mesa y precios desde la fuente única', async ({ page }) => {
  await page.route('https://**/*', route => route.abort());
  await page.goto('/carta?mesa=1', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nuestra carta.');
  await expect(page.locator('#mesa')).toHaveText('Mesa 1');
  await expect.poll(async () => Math.abs((await page.locator('.carta-nav').boundingBox())!.y)).toBeLessThan(2);
  await expect(page.getByRole('link', { name: 'Actualizar carta' })).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/pesos chilenos|CLP/);
  await expect(page.locator('[data-product-id]')).toHaveCount(products.filter(product => product.status !== 'oculto').length);
  await expect(page.locator('[data-menu-panel]:visible')).toHaveCount(1);
  await expect(page.locator('[data-menu-group-section]:visible')).toHaveCount(1);
  await expect(page.locator('[data-product-id]:visible')).toHaveCount(products.filter(product => product.status !== 'oculto' && product.group === 'cafe').length);
  for (const product of products) {
    const card = page.locator(`[data-product-id="${product.id}"]`);
    if (product.status === 'oculto') { await expect(card).toHaveCount(0); continue; }
    await expect(card.locator('.price')).toHaveText(formatPrice(product.price));
    if (product.status === 'agotado') await expect(card.locator('.sold-out')).toHaveText('Agotado');
    for (const tag of product.tags ?? []) await expect(card).toContainText(dietaryTagLabels[tag]);
  }
  await page.getByRole('link', { name: 'Heladería', exact: true }).click();
  await expect(page).toHaveURL(/mesa=1#heladeria$/);
  await expect(page.locator('astro-island, iframe, input[type=password]')).toHaveCount(0);
});
test('todos los productos y categorías están disponibles sin JavaScript; mesa inválida se ignora', async ({ browser, page }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const plain = await context.newPage();
  await plain.goto('http://127.0.0.1:4378/carta');
  await expect(plain.locator('[data-product-id]')).toHaveCount(products.filter(product => product.status !== 'oculto').length);
  await expect(plain.getByRole('navigation', { name: 'Categorías de la carta' }).getByRole('link')).toHaveCount(3);
  await expect(plain.locator('[data-product-id]:visible')).toHaveCount(products.filter(product => product.status !== 'oculto').length);
  await expect(plain.getByRole('searchbox')).toHaveCount(0);
  await context.close();
  await page.goto('/carta?mesa=%3Cscript%3E');
  await expect(page.locator('#mesa')).toHaveAttribute('hidden', '');
  await expect(page.locator('main script')).toHaveCount(0);
});

test('grupos, búsqueda global sin acentos, vacíos y teclado conservan la mesa', async ({ page }) => {
  await page.goto('/carta?mesa=7');
  const nav = page.getByRole('navigation', { name: 'Categorías de la carta' });
  await nav.getByRole('link', { name: 'Heladería', exact: true }).click();
  await expect(page.locator('[data-menu-group-section]:visible')).toHaveAttribute('data-menu-group-section', 'copas');
  await page.getByRole('button', { name: 'Barquillos', exact: true }).click();
  await expect(page.locator('[data-menu-group-section]:visible')).toHaveAttribute('data-menu-group-section', 'barquillos');
  await page.getByRole('button', { name: 'Ver todo', exact: true }).click();
  await expect(page.locator('[data-product-id]:visible')).toHaveCount(products.filter(product => product.status !== 'oculto' && product.category === 'heladeria').length);
  const search = page.getByRole('searchbox', { name: 'Buscar en la carta' });
  const target = products.find(product => product.status !== 'oculto' && product.category === 'comida')!;
  await page.mouse.wheel(0, 800);
  await search.fill(target.name.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  await expect(page.locator(`[data-product-id="${target.id}"]`)).toBeVisible();
  await expect.poll(async () => Math.abs((await page.locator('.carta-nav').boundingBox())!.y)).toBeLessThan(2);
  expect((await page.locator(`[data-product-id="${target.id}"]`).boundingBox())!.y).toBeGreaterThan((await page.locator('.carta-nav').boundingBox())!.height);
  await expect(page.getByRole('status')).toContainText('en toda la carta');
  await search.fill('zzzz-no-existe');
  await expect(page.getByRole('heading', { name: 'No encontramos ese antojo' })).toBeVisible();
  await expect(page.locator('[data-product-id]:visible')).toHaveCount(0);
  await page.getByRole('button', { name: 'Borrar búsqueda', exact: true }).click();
  await expect(search).toHaveValue('');
  await expect(page.locator('[data-product-id]:visible')).toHaveCount(products.filter(product => product.status !== 'oculto' && product.category === 'heladeria').length);
  await nav.getByRole('link', { name: 'Heladería', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(nav.getByRole('link', { name: 'Para comer', exact: true })).toHaveAttribute('aria-current', 'true');
  expect(new URL(page.url()).searchParams.get('mesa')).toBe('7');
  await page.reload();
  await expect(nav.getByRole('link', { name: 'Para comer', exact: true })).toHaveAttribute('aria-current', 'true');
  await expect.poll(async () => Math.abs((await page.locator('.carta-nav').boundingBox())!.y)).toBeLessThan(2);
});

test('Arriba aparece al bajar y vuelve al menú sin perder filtros ni mesa, incluso con movimiento reducido', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto('/carta?mesa=4');
  const up = page.getByRole('button', { name: 'Volver al inicio de la carta', exact: true });
  await expect(up).toBeHidden();
  await page.mouse.wheel(0, 850);
  await expect(up).toBeVisible();
  await up.click();
  await expect.poll(async () => Math.abs((await page.locator('.carta-nav').boundingBox())!.y)).toBeLessThan(2);
  await expect(up).toBeHidden();
  await expect(page.locator('[data-menu-group="cafe"]')).toHaveAttribute('aria-pressed', 'true');
  expect(new URL(page.url()).searchParams.get('mesa')).toBe('4');
});
for (const path of ['/carta?mesa=4', '/']) {
  test(`Arriba vuelve de forma gradual y lenta sin saltos (${path})`, async ({ page }) => {
    await page.route('https://**/*', route => route.abort());
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 390, height: 700 });
    await page.goto(path, { waitUntil: 'load' });
    await page.mouse.wheel(0, 1100);
    await expect(page.locator('[data-back-to-top]')).toBeVisible();
    const result = await page.evaluate(async () => {
      const button = document.querySelector<HTMLButtonElement>('[data-back-to-top]')!;
      const start = window.scrollY, started = performance.now();
      button.click();
      const immediate = window.scrollY;
      let early = start;
      const samples: number[] = [];
      await new Promise<void>((resolve, reject) => {
        function sample() {
          const elapsed = performance.now() - started;
          samples.push(window.scrollY);
          if (elapsed < 300) early = window.scrollY;
          if (!button.hasAttribute('aria-busy')) return resolve();
          if (elapsed > 4000) return reject(new Error('La animación no termina.'));
          requestAnimationFrame(sample);
        }
        requestAnimationFrame(sample);
      });
      return { start, immediate, early, end: window.scrollY, duration: performance.now() - started, samples };
    });
    expect(Math.abs(result.immediate - result.start)).toBeLessThan(2);
    expect(result.duration).toBeGreaterThan(1100);
    expect(result.early).toBeLessThan(result.start);
    expect(result.early).toBeGreaterThan((result.start + result.end) / 2);
    for (let index = 1; index < result.samples.length; index++) expect(result.samples[index]).toBeLessThanOrEqual(result.samples[index - 1] + 2);
    if (path === '/') expect(result.end).toBeLessThan(2);
    else {
      await expect.poll(async () => Math.abs((await page.locator('.carta-nav').boundingBox())!.y)).toBeLessThan(2);
      expect(new URL(page.url()).searchParams.get('mesa')).toBe('4');
    }
  });
}

test('un desplazamiento manual interrumpe Arriba y conserva el control del usuario', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto('/carta?mesa=4');
  await page.mouse.wheel(0, 1100);
  const up = page.locator('[data-back-to-top]');
  await expect(up).toBeVisible();
  await up.click();
  await expect(up).toHaveAttribute('aria-busy', 'true');
  await page.mouse.wheel(0, 180);
  await expect(up).not.toHaveAttribute('aria-busy', 'true');
  const y = await page.evaluate(() => window.scrollY);
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(y - 2);
  await expect(page.locator('.carta-nav')).toBeVisible();
});

test('etiquetas se guardan desde el panel, incluso cuando son el único cambio', async ({ page }) => {
  let product = { ...products[0], tags: [] as string[] };
  let writes = 0;
  await page.route('https://**/*', route => route.abort());
  await page.route('**/menu-version.json?*', route => route.fulfill({ json: { version: 'version' } }));
  await page.route('**/api/admin/**', async route => {
    if (route.request().url().endsWith('/session')) return route.fulfill({ json: { email: 'owner@example.test', expiresAt: 9999999999, logoutUrl: '/cdn-cgi/access/logout' } });
    if (route.request().method() === 'PUT') { product = { ...product, ...route.request().postDataJSON().product }; writes++; }
    return route.fulfill({ json: { menu: { products: [product] }, revision: 'a'.repeat(40), version: 'version' } });
  });
  await page.goto('/admin/');
  await page.getByRole('button', { name: `Editar ${product.name}`, exact: true }).click();
  await page.getByRole('checkbox', { name: 'Vegetariano', exact: true }).check();
  await expect(page.getByRole('button', { name: 'Guardar producto', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Guardar producto', exact: true }).click();
  await expect.poll(() => writes).toBe(1);
  expect(product.tags).toEqual(['vegetariano']);
});
