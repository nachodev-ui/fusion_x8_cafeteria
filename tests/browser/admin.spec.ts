import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { menuSignatureInput, parseMenu } from '../../src/data/menu-schema';
let harness: string;
test.beforeAll(async () => {
  const result = await build({ entryPoints: ['tests/browser/widget-harness.ts'], bundle: true, write: false, format: 'iife', loader: { '.css': 'empty' }, define: { 'process.env.NODE_ENV': '"test"' } });
  harness = result.outputFiles[0].text;
});
async function loadHarness(page: import('@playwright/test').Page) {
  await page.route('**/test-harness', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html lang="es"><body><div id="root"></div></body></html>' }));
  await page.goto('/test-harness');
  await page.addScriptTag({ content: harness });
}
for (const width of [1280, 390]) {
  test(`crear, editar, categoría/grupo, filtros, errores y eliminar (${width}px, sin capturas)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 }); await loadHarness(page);
    await page.getByLabel('Buscar por nombre').fill('Café');
    await expect(page.locator('.fusion-products li')).toHaveCount(1);
    await page.getByLabel('Buscar por nombre').fill('');
    await page.getByLabel('Filtrar estado').selectOption('oculto');
    await expect(page.locator('.fusion-products li')).toHaveCount(1);
    await page.getByLabel('Filtrar estado').selectOption('');
    await page.getByRole('button', { name: 'Crear producto', exact: true }).click();
    await page.getByLabel('Nombre', { exact: true }).fill('Nuevo producto');
    await page.getByLabel('Descripción', { exact: true }).fill('Nueva descripción');
    await page.locator('#product-category').selectOption('comida');
    await expect(page.locator('#product-group')).toHaveValue('');
    await expect(page.locator('#product-group').locator('option[value="cafe"]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Guardar prueba', exact: true }).click();
    await expect(page.locator('#saved')).toHaveText('');
    await page.locator('#product-group').selectOption('pasteles');
    await page.getByLabel('Precio por confirmar', { exact: true }).uncheck();
    await page.getByLabel('Precio entero en CLP').fill('-1');
    await expect(page.locator('.fusion-error')).toContainText('entero');
    await page.getByLabel('Precio entero en CLP').fill('2500');
    await page.getByLabel('Precio por confirmar', { exact: true }).check();
    await page.locator('#product-status').selectOption('agotado');
    await page.getByLabel('Fallar guardado').check();
    await page.getByRole('button', { name: 'Guardar prueba', exact: true }).click();
    await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Nuevo producto');
    await expect(page.locator('.fusion-status')).toContainText('No se pudo guardar');
    await page.getByLabel('Fallar guardado').uncheck();
    await page.getByRole('button', { name: 'Guardar prueba', exact: true }).click();
    const saved = JSON.parse(await page.locator('#saved').innerText());
    expect(saved.at(-1)).toMatchObject({ price: null, category: 'comida', group: 'pasteles', status: 'agotado' });
    const id = saved.at(-1).id;
    await page.getByLabel('Nombre', { exact: true }).fill('Nombre editado');
    await page.getByRole('button', { name: 'Guardar prueba', exact: true }).click();
    expect(JSON.parse(await page.locator('#saved').innerText()).at(-1).id).toBe(id);
    await page.getByRole('button', { name: 'Eliminar Nombre editado', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Nombre editado');
    await expect(page.getByRole('dialog')).toContainText('Oculto');
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await expect(page.locator('.fusion-products li')).toHaveCount(4);
    await page.getByRole('button', { name: 'Eliminar Nombre editado', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
    await page.getByRole('button', { name: 'Guardar prueba', exact: true }).click();
    const after = JSON.parse(await page.locator('#saved').innerText());
    expect(after).toHaveLength(3); expect(after[0]).toMatchObject({ note: 'No perder', image: 'cookie-cup' });
    await page.getByLabel('Buscar por nombre').fill('sin coincidencias');
    await expect(page.getByText('No hay productos que coincidan con los filtros.')).toBeAttached();
  });
}
test('pedido rechaza adiciones forzadas y oculta productos retirados', async ({ page }) => {
  await loadHarness(page);
  await page.getByRole('button', { name: 'Forzar agotado' }).click();
  await page.getByRole('button', { name: 'Forzar oculto' }).click();
  await page.getByRole('button', { name: 'Abrir pedido' }).click();
  await expect(page.locator('#order-product option[value="agotado"]')).toBeDisabled();
  await expect(page.locator('#order-product option[value="oculto"]')).toHaveCount(0);
  await expect(page.locator('.order-items li')).toHaveCount(0);
  await page.getByRole('button', { name: 'Agregar producto seleccionado', exact: true }).click();
  await expect(page.locator('.order-items li')).toHaveCount(1);
  await expect(page.locator('.order-items')).toContainText('Café prueba');
});
test('el gestor real carga en español y exige sesión antes de consultar contenido', async ({ page }) => {
  test.skip(!existsSync('.npm-cache/decap-cms-3.17.3.js'), 'Descargar el bundle fijado para esta comprobación de integración.');
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.route('https://cdn.jsdelivr.net/npm/decap-cms@3.17.3/dist/decap-cms.js', route => route.fulfill({ contentType: 'application/javascript', body: readFileSync('.npm-cache/decap-cms-3.17.3.js'), headers: { 'Access-Control-Allow-Origin': '*' } }));
  await page.route('https://**.example.test/**', route => route.fulfill({ status: 401, contentType: 'application/json', body: '{"message":"Unauthorized"}', headers: { 'Access-Control-Allow-Origin': '*' } }));
  await page.goto('/admin/');
  try { await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeVisible(); }
  catch (error) { throw new Error(`${String(error)}\nBrowser errors: ${JSON.stringify(errors)}`); }
  await expect(page.getByRole('button', { name: 'Crear producto', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
});

test('formulario nativo de Decap guarda y reabre mediante el contrato del gateway de prueba', async ({ page }) => {
  test.skip(!existsSync('.npm-cache/decap-cms-3.17.3.js'), 'Necesita el bundle fijado.');
  page.on('dialog', dialog => { void dialog.accept(); });
  // Only in the browser test: replace the official gateway factory with Decap's
  // test-repo authentication and an in-memory Contents API. Production has neither.
  await page.addInitScript(() => {
    let cms: any;
    Object.defineProperty(window, 'CMS', { configurable: true, get: () => cms, set: value => {
      cms = value;
      const getBackend = cms.getBackend;
      cms.getBackend = (name: string) => name !== 'git-gateway' ? getBackend(name) : { init: (config: any, options: any) => {
        const gateway = getBackend('test-repo').init(config, options);
        gateway.branch = 'main';
        gateway.api = { request: async (path: string, options?: any) => {
          const response = await fetch('/test-gateway' + path, options);
          if (!response.ok) throw Object.assign(new Error('Gateway rejected request'), { status: response.status });
          return response.json();
        } };
        return gateway;
      } };
    } });
  });
  let fixture = { products: [{ id: 'cafe', name: 'Café integración', description: 'Conservar descripción', price: null, category: 'cafeteria', group: 'cafe', status: 'disponible', note: 'Conservar nota', image: 'cookie-cup' }] };
  let sha = 'first-version';
  let reads = 0;
  let deployedVersion = 'old-version';
  await page.route('**/menu-version.json?*', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: deployedVersion }) }));
  await page.route('**/test-gateway/**', async route => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      if (body.sha !== sha) return route.fulfill({ status: 409 });
      fixture = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'));
      sha = 'next-version';
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ content: { sha } }) });
    }
    reads++;
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ sha, encoding: 'base64', content: Buffer.from(JSON.stringify(fixture)).toString('base64') }) });
  });
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.route('https://cdn.jsdelivr.net/npm/decap-cms@3.17.3/dist/decap-cms.js', route => route.fulfill({ contentType: 'application/javascript', body: readFileSync('.npm-cache/decap-cms-3.17.3.js'), headers: { 'Access-Control-Allow-Origin': '*' } }));
  await page.goto('/admin/');
  await page.getByRole('button', { name: /iniciar sesión/i }).click();
  await page.getByText('Administrar productos', { exact: true }).click();
  await page.getByRole('button', { name: 'Editar Café integración', exact: true }).click();
  await page.locator('#product-name').fill('Café actualizado');
  await page.locator('#product-status').selectOption('agotado');
  await page.getByRole('button', { name: 'Guardar y solicitar publicación', exact: true }).click();
  await page.getByRole('menuitem', { name: 'Guardar y solicitar publicación', exact: true }).click();
  await expect(page.locator('.fusion-status')).toContainText('Cambios guardados en el repositorio');
  expect(fixture.products[0]).toMatchObject({ name: 'Café actualizado', price: null, status: 'agotado', note: 'Conservar nota', image: 'cookie-cup' });
  await expect(page.locator('.fusion-status')).not.toContainText('disponibles en la web');
  // A deployed version must be verified, and must never clear newer unsaved edits.
  deployedVersion = createHash('sha256').update(menuSignatureInput(parseMenu(fixture))).digest('hex');
  await expect(page.locator('.fusion-status')).toContainText('disponibles en la web', { timeout: 8000 });
  await page.locator('#product-name').fill('Cambio sin guardar');
  await expect(page.locator('.fusion-status')).toContainText('Cambios sin guardar');
  await expect(page.locator('.fusion-status')).not.toContainText('disponibles en la web');
  const beforeReload = reads;
  await page.reload();
  // Session is the test-repo session; the provider's PKCE is tested externally.
  await expect(page.getByRole('button', { name: 'Editar Café actualizado', exact: true })).toBeAttached();
  expect(reads).toBeGreaterThan(beforeReload);
  await page.getByRole('button', { name: 'Account options dropdown' }).click();
  await page.getByText('Cerrar sesión', { exact: true }).click();
  await expect(page.getByRole('button', { name: /iniciar sesión/i })).toBeAttached();
  await expect(page.getByRole('button', { name: 'Crear producto', exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('carta pública y pedido muestran los datos de la única fuente JSON', async ({ page }) => {
  const menu = parseMenu(JSON.parse(readFileSync('src/data/products.json', 'utf8')));
  const visible = menu.products.filter(p => p.status !== 'oculto');
  await page.route('https://**/*', route => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.menu-entry')).toHaveCount(visible.length);
  for (const product of visible) {
    const card = page.locator('.menu-entry').filter({ has: page.getByRole('heading', { name: product.name, exact: true, includeHidden: true }) });
    await expect(card.locator('p')).toHaveText(product.description);
  }
  await page.locator('[data-add-product="espresso"]').click();
  await page.locator('[data-add-product="chocolate-caliente"]').click();
  await page.locator('.order-basket').click();
  await expect(page.locator('#order-product option')).toHaveCount(visible.length);
  await expect(page.locator('.order-items li')).toHaveCount(2);
  await expect(page.locator('.order-items')).toContainText(menu.products.find(p => p.id === 'espresso')!.description);
  await expect(page.locator('.pending-total-note')).toContainText('El subtotal no incluye');
  await expect(page.locator('.order-total strong')).toContainText('1.900');
  const version = await (await page.request.get('/menu-version.json')).json();
  expect(version.version).toBe(createHash('sha256').update(menuSignatureInput(menu)).digest('hex'));
});
