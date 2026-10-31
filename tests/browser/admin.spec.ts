import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { menuSignatureInput, parseMenu, type MenuData } from '../../src/data/menu-schema';

// Only browser test fixtures. Real JWT signature validation runs in api.test.ts.
async function fixture(page: Page, authorized = true, many = false) {
  let menu: MenuData = { products: [
    { id: 'cafe', name: 'Café prueba', description: 'Descripción', price: null, category: 'cafeteria', group: 'cafe', status: 'disponible', note: 'Conservar nota', image: 'cookie-cup' },
    { id: 'agotado', name: 'Pastel agotado', description: '', price: 2500, category: 'comida', group: 'pasteles', status: 'agotado' },
    { id: 'oculto', name: 'Pastel oculto', description: '', price: 0, category: 'comida', group: 'pasteles', status: 'oculto' },
  ] };
  if (many) for (let i = 0; i < 28; i++) menu.products.push({ ...menu.products[0], id: `extra-${i}`, name: `Extra ${i}` });
  let revision = '1'.repeat(40), reads = 0, writes = 0, fail = false, live = false;
  const version = () => createHash('sha256').update(menuSignatureInput(menu)).digest('hex');
  await page.route('https://**/*', route => route.abort());
  await page.route('**/menu-version.json?*', route => route.fulfill({ json: { version: live ? version() : 'old-version' } }));
  await page.route('**/cdn-cgi/access/logout', route => route.fulfill({ contentType: 'text/html', body: '<p>Sesión cerrada en la prueba</p>' }));
  await page.route('**/api/admin/**', async route => {
    const request = route.request(), path = new URL(request.url()).pathname;
    if (!authorized) return route.fulfill({ status: 401, json: { message: 'Inicia sesión para administrar la carta.' } });
    if (path.endsWith('/session')) return route.fulfill({ json: { email: 'owner@example.test', expiresAt: 9999999999, logoutUrl: '/cdn-cgi/access/logout' } });
    const snapshot = () => ({ menu, revision, version: version() });
    if (request.method() === 'GET') { reads++; return route.fulfill({ json: snapshot() }); }
    if (fail) return route.fulfill({ status: 502, json: { code: 'SAVE_UNCERTAIN', message: 'Se perdió la respuesta del repositorio. Conservamos el formulario.' } });
    const body = request.postDataJSON(), id = path.split('/').at(-1)!;
    if (body.revision !== revision) return route.fulfill({ status: 409, json: { code: 'CONFLICT', message: 'La carta cambió en otra sesión. Conservamos tu formulario; carga la versión actual.' } });
    if (request.method() === 'POST') menu.products.push({ id: body.id, ...body.product });
    if (request.method() === 'PUT') menu = { products: menu.products.map(p => p.id === id ? { ...p, ...body.product } : p) };
    if (request.method() === 'DELETE') menu = { products: menu.products.filter(p => p.id !== id) };
    writes++; revision = String(writes + 1).repeat(40);
    return route.fulfill({ json: snapshot() });
  });
  return { get menu() { return menu; }, get reads() { return reads; }, get writes() { return writes; }, fail(value: boolean) { fail = value; }, publish() { live = true; }, concurrent() { revision = 'f'.repeat(40); menu.products[0].name = 'Cambio de otra sesión'; } };
}

test('sin sesión no consulta productos ni ofrece escritura', async ({ page }) => {
  const api = await fixture(page, false);
  await page.goto('/admin/');
  await expect(page.getByRole('link', { name: 'Iniciar sesión', exact: true })).toHaveAttribute('href', '/api/admin/login');
  await expect(page.getByRole('button', { name: 'Crear producto', exact: true })).toHaveCount(0);
  expect(api.reads).toBe(0);
  await expect(page.locator('meta[name=robots]')).toHaveAttribute('content', /noindex/);
});

test('fallo de carga muestra el error y permite reintentar sin habilitar productos ficticios', async ({ page }) => {
  await fixture(page);
  await page.route('**/api/admin/products', route => route.fulfill({ status: 503, json: { code: 'NOT_CONFIGURED', message: 'Falta configurar el acceso privado al repositorio.' } }));
  await page.goto('/admin/');
  await expect(page.getByRole('alert')).toContainText('Falta configurar');
  await expect(page.getByRole('button', { name: 'Crear producto', exact: true })).toBeDisabled();
  await expect(page.getByText('No se pudo cargar la carta.', { exact: false })).toBeAttached();
  await page.unroute('**/api/admin/products');
  await page.getByRole('button', { name: 'Cargar versión actual', exact: true }).click();
  await expect(page.locator('.fusion-products li')).toHaveCount(3);
});

for (const width of [1280, 390]) {
  test(`CRUD, validación, filtros, errores, persistencia y publicación (${width}px; DOM sin capturas)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    const api = await fixture(page);
    await page.goto('/admin/');
    await expect(page.locator('.fusion-products li')).toHaveCount(3);
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
    await expect(page.locator('#product-group option[value="cafe"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Guardar producto', exact: true })).toBeDisabled();
    await page.locator('#product-group').selectOption('pasteles');
    await page.getByLabel('Precio por confirmar', { exact: true }).uncheck();
    await expect(page.getByLabel('Precio entero en CLP')).toHaveValue('');
    await page.getByLabel('Precio entero en CLP').fill('-1');
    await expect(page.getByRole('button', { name: 'Guardar producto', exact: true })).toBeDisabled();
    await page.getByLabel('Precio entero en CLP').fill('2500');
    await page.getByLabel('Precio por confirmar', { exact: true }).check();
    await page.locator('#product-status').selectOption('agotado');
    api.fail(true);
    await page.getByRole('button', { name: 'Guardar producto', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Se perdió la respuesta');
    await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Nuevo producto');
    expect(api.writes).toBe(0);
    api.fail(false);
    await page.getByRole('button', { name: 'Guardar producto', exact: true }).click();
    await expect(page.locator('.fusion-products li')).toHaveCount(4);
    const added = api.menu.products.at(-1)!;
    expect(added).toMatchObject({ price: null, category: 'comida', group: 'pasteles', status: 'agotado' });
    await expect(page.locator('.fusion-publication')).toContainText('esperando confirmar');
    api.publish();
    await expect(page.locator('.fusion-publication')).toContainText('versión verificada', { timeout: 8000 });
    await page.getByRole('button', { name: 'Editar Nuevo producto', exact: true }).click();
    await page.getByLabel('Nombre', { exact: true }).fill('Nombre editado');
    await page.locator('#product-status').selectOption('oculto');
    await page.getByRole('button', { name: 'Guardar producto', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Editar Nombre editado', exact: true })).toBeAttached();
    expect(api.menu.products.at(-1)!.id).toBe(added.id);
    await page.reload();
    await expect(page.getByRole('button', { name: 'Editar Nombre editado', exact: true })).toBeAttached();
    await page.getByRole('button', { name: 'Eliminar Nombre editado', exact: true }).click();
    await expect(page.getByRole('dialog')).toContainText('Nombre editado');
    await expect(page.getByRole('dialog')).toContainText('Oculto');
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
    expect(api.menu.products).toHaveLength(4);
    await page.getByRole('button', { name: 'Eliminar Nombre editado', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar', exact: true }).click();
    await expect(page.locator('.fusion-products li')).toHaveCount(3);
    expect(api.menu.products[0]).toMatchObject({ note: 'Conservar nota', image: 'cookie-cup', price: null });
    await page.getByLabel('Buscar por nombre').fill('sin coincidencias');
    await expect(page.getByText('No encontramos productos')).toBeAttached();
    await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
    await expect(page).toHaveURL(/\/cdn-cgi\/access\/logout$/);
    expect(errors).toEqual([]);
  });
}

test('conflicto conserva el formulario y avisa antes de descartar', async ({ page }) => {
  const api = await fixture(page);
  await page.goto('/admin/');
  await page.getByRole('button', { name: 'Editar Café prueba', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Mi cambio');
  api.concurrent();
  await page.getByRole('button', { name: 'Guardar producto', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('otra sesión');
  await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Mi cambio');
  expect(api.writes).toBe(0);
  await page.getByRole('button', { name: 'Cargar versión actual', exact: true }).click();
  await expect(page.locator('.fusion-conflict')).toContainText('Cambio de otra sesión');
  await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Mi cambio');
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('sin guardar');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('button', { name: 'Guardar producto', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Editar Mi cambio', exact: true })).toBeAttached();
  expect(api.menu.products[0]).toMatchObject({ id: 'cafe', note: 'Conservar nota', image: 'cookie-cup', name: 'Mi cambio' });
});

test('paginación y filtros locales; cambiar estado requiere guardar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const api = await fixture(page, true, true);
  await page.goto('/admin/');
  await expect(page.locator('.fusion-products li')).toHaveCount(12);
  await page.getByLabel('Estado de Café prueba', { exact: true }).selectOption('agotado');
  await expect(page.locator('#product-status')).toHaveValue('agotado');
  expect(api.writes).toBe(0);
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(page.locator('.fusion-products li')).toHaveCount(12);
  await page.getByLabel('Buscar por nombre').fill('Café prueba');
  await expect(page.locator('.fusion-products li')).toHaveCount(1);
  expect(api.reads).toBe(1);
  await page.getByRole('button', { name: 'Guardar producto', exact: true }).click();
  await expect(page.getByLabel('Estado de Café prueba', { exact: true })).toHaveValue('agotado');
});

test('carta pública y pedido siguen leyendo la única fuente JSON', async ({ page }) => {
  const menu = parseMenu(JSON.parse(readFileSync('src/data/products.json', 'utf8')));
  const visible = menu.products.filter(p => p.status !== 'oculto');
  await page.route('https://**/*', route => route.abort());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.menu-entry')).toHaveCount(visible.length);
  for (const product of visible) {
    const card = page.locator('.menu-entry').filter({ has: page.getByRole('heading', { name: product.name, exact: true, includeHidden: true }) });
    await expect(card.locator('p')).toHaveText(product.description);
  }
  await expect(page.locator('astro-island[component-url*="WhatsAppOrder"]')).not.toHaveAttribute('ssr', '');
  await page.locator('[data-add-product="espresso"]').click();
  await page.locator('[data-add-product="chocolate-caliente"]').click();
  await page.locator('.order-basket').click();
  await expect(page.locator('#order-product option')).toHaveCount(visible.length);
  await expect(page.locator('.order-items li')).toHaveCount(2);
  await expect(page.locator('.pending-total-note')).toContainText('El subtotal no incluye');
  await expect(page.locator('.order-total strong')).toContainText('1.900');
  const version = await (await page.request.get('/menu-version.json')).json();
  expect(version.version).toBe(createHash('sha256').update(menuSignatureInput(menu)).digest('hex'));
});
