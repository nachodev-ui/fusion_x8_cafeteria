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
  await expect(page.getByRole('link', { name: 'Actualizar carta' })).toHaveAttribute('href', '/carta?mesa=1');
  await expect(page.locator('[data-product-id]')).toHaveCount(products.filter(product => product.status !== 'oculto').length);
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
  await context.close();
  await page.goto('/carta?mesa=%3Cscript%3E');
  await expect(page.locator('#mesa')).toHaveAttribute('hidden', '');
  await expect(page.locator('main script')).toHaveCount(0);
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
