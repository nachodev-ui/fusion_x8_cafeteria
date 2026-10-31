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
    await page.getByRole('radio', { name: 'Agotado', exact: true }).check();
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
    await page.getByRole('radio', { name: 'Oculto', exact: true }).check();
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
  await expect(page.getByRole('radio', { name: 'Agotado', exact: true })).toBeChecked();
  expect(api.writes).toBe(0);
  await page.getByRole('button', { name: 'Guardar producto', exact: true }).click();
  await page.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(page.locator('.fusion-products li')).toHaveCount(12);
  await page.getByLabel('Buscar por nombre').fill('Café prueba');
  await expect(page.locator('.fusion-products li')).toHaveCount(1);
  expect(api.reads).toBe(1);
  await expect(page.getByLabel('Estado de Café prueba', { exact: true })).toHaveValue('agotado');
});

test('editor dedicado conserva filtros, muestra vista previa y permite cancelar sin perder el formulario', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const api = await fixture(page);
  await page.goto('/admin/');
  await page.getByLabel('Buscar por nombre').fill('Café');
  await page.getByRole('button', { name: 'Editar Café prueba', exact: true }).click();
  await expect(page.locator('#product-name')).toBeFocused();
  await expect(page.getByRole('region', { name: 'Listado de productos' })).toHaveCount(0);
  await expect(page.getByLabel('Buscar por nombre')).toBeHidden();
  await page.getByLabel('Nombre', { exact: true }).fill('Latte de prueba');
  const preview = page.getByRole('complementary', { name: 'Vista previa del producto' });
  await expect(preview.getByRole('heading', { name: 'Latte de prueba' })).toBeAttached();
  await page.getByLabel('Precio por confirmar', { exact: true }).uncheck();
  await page.getByLabel('Precio entero en CLP').fill('-1');
  await page.getByLabel('Precio entero en CLP').press('Tab');
  await expect(page.getByLabel('Precio entero en CLP')).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Precio entero en CLP').fill('3500');
  await expect(preview).toContainText('3.500');
  await page.getByRole('radio', { name: 'Oculto', exact: true }).check();
  await expect(preview).toContainText('Este producto estará oculto');
  expect(api.writes).toBe(0);
  await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Latte de prueba');
  await page.getByRole('button', { name: 'Volver a productos', exact: false }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Descartar cambios' }).click();
  await expect(page.getByLabel('Buscar por nombre')).toHaveValue('Café');
  await expect(page.getByRole('button', { name: 'Editar Café prueba', exact: true })).toBeFocused();
  expect(api.writes).toBe(0);
});

test('feedback distingue guardar, esperar publicación y versión verificada sin perder cambios nuevos', async ({ page }) => {
  const api = await fixture(page);
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route('**/api/admin/products/cafe', async route => { await pending; await route.fallback(); });
  await page.goto('/admin/');
  await page.getByRole('button', { name: 'Editar Café prueba', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Guardado nuevo');
  await page.getByRole('button', { name: 'Guardar producto', exact: true }).click();
  const toast = page.locator('.fusion-toast');
  try {
    await expect(toast).toHaveAttribute('data-phase', 'saving');
    await expect(toast.locator('.fusion-spinner')).toHaveCount(1);
    await expect(page.getByRole('button', { name: 'Guardando…', exact: true })).toBeDisabled();
  } finally { release(); }
  await expect(toast).toHaveAttribute('data-phase', 'waiting');
  await expect(toast).not.toContainText('verificamos', { ignoreCase: true });
  expect(api.writes).toBe(1);
  await page.getByRole('button', { name: 'Editar Guardado nuevo', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Todavía sin guardar');
  api.publish();
  await expect(toast).toHaveAttribute('data-phase', 'success', { timeout: 8000 });
  await expect(toast).toContainText('Último guardado publicado');
  await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Todavía sin guardar');
  await page.getByRole('button', { name: 'Cerrar notificación' }).click();
  await expect(toast).toHaveCount(0);
});

test('logo y cierre de sesión usan confirmación propia sin disparar una segunda alerta del navegador', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  const nativeDialogs: string[] = [];
  page.on('dialog', dialog => { nativeDialogs.push(dialog.type()); void dialog.dismiss(); });
  await page.goto('/admin/');
  await page.getByRole('button', { name: 'Editar Café prueba', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Cambio pendiente');
  await page.locator('[data-admin-home]').click();
  await expect(page.getByRole('dialog')).toContainText('Hay cambios sin guardar');
  await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Cambio pendiente');
  await page.locator('[data-admin-home]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Descartar cambios' }).click();
  await expect(page.getByRole('button', { name: 'Crear producto', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Editar Café prueba', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Otro cambio');
  await page.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Descartar cambios' }).click();
  await expect(page).toHaveURL(/\/cdn-cgi\/access\/logout$/);
  expect(nativeDialogs).toEqual([]);
});

test('publicación sin confirmar y errores mantienen feedback honesto', async ({ page }) => {
  const api = await fixture(page);
  await page.goto('/admin/');
  await page.getByRole('button', { name: 'Editar Café prueba', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Pendiente');
  api.fail(true);
  await page.getByRole('button', { name: 'Guardar producto', exact: true }).click();
  await expect(page.locator('.fusion-toast')).toHaveAttribute('data-phase', 'error');
  await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Pendiente');
  api.fail(false);
  await page.clock.install();
  await page.getByRole('button', { name: 'Guardar producto', exact: true }).click();
  await expect(page.locator('.fusion-toast')).toHaveAttribute('data-phase', 'waiting');
  await page.clock.fastForward(301_000);
  await expect(page.locator('.fusion-toast')).toContainText('Publicación sin confirmar');
  await expect(page.locator('.fusion-publication')).not.toContainText('versión verificada');
  api.publish();
  await page.getByRole('button', { name: 'Volver a comprobar publicación' }).click();
  await expect(page.locator('.fusion-publication')).toContainText('versión verificada');
  expect(api.writes).toBe(1);
});

test('recargar conserva protección nativa y un guardado con contenido idéntico vuelve a verificarse', async ({ page }) => {
  const api = await fixture(page);
  await page.goto('/admin/');
  await page.getByRole('button', { name: 'Editar Café prueba', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Nuevo nombre');
  const dialogReady = page.waitForEvent('dialog');
  // A cancelled reload may keep waiting for a load event that will never fire.
  const reload = page.reload({ timeout: 3000 }).catch(() => null);
  const native = await dialogReady;
  expect(native.type()).toBe('beforeunload');
  await native.dismiss(); await reload;
  await expect(page.getByLabel('Nombre', { exact: true })).toHaveValue('Nuevo nombre');
  api.publish();
  await page.getByRole('button', { name: 'Guardar producto', exact: true }).click();
  await expect(page.locator('.fusion-toast')).toHaveAttribute('data-phase', 'success');
  await page.getByRole('button', { name: 'Editar Nuevo nombre', exact: true }).click();
  await page.getByLabel('Nombre', { exact: true }).fill('Nuevo nombre ');
  await page.getByRole('button', { name: 'Guardar producto', exact: true }).click();
  await expect(page.locator('.fusion-publication')).toContainText('versión verificada');
  await expect(page.locator('.fusion-toast')).toHaveAttribute('data-phase', 'success');
  expect(api.writes).toBe(2);
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
  const priced = visible.find(p => p.category === 'cafeteria' && p.status === 'disponible' && p.price !== null);
  const pending = visible.find(p => p.category === 'cafeteria' && p.status === 'disponible' && p.price === null);
  for (const product of visible.filter(p => p.status === 'agotado')) {
    const card = page.locator('.menu-entry').filter({ has: page.getByRole('heading', { name: product.name, exact: true, includeHidden: true }) });
    await expect(card.locator('.menu-entry-add')).toBeDisabled();
    await expect(card.locator('[data-add-product]')).toHaveCount(0);
  }
  if (priced && pending) {
    await page.locator(`[data-add-product="${priced.id}"]`).click();
    await page.locator(`[data-add-product="${pending.id}"]`).click();
    await page.locator('.order-basket').click();
    await expect(page.locator('#order-product option')).toHaveCount(visible.length);
    await expect(page.locator('.order-items li')).toHaveCount(2);
    await expect(page.locator('.pending-total-note')).toContainText('El subtotal no incluye');
    await expect(page.locator('.order-total strong')).toContainText(new Intl.NumberFormat('es-CL').format(priced.price!));
  }
  const version = await (await page.request.get('/menu-version.json')).json();
  expect(version.version).toBe(createHash('sha256').update(menuSignatureInput(menu)).digest('hex'));
});
