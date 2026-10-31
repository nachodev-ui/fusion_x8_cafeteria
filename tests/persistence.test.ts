import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installMenuPersistence, MENU_PATH, menuHash, type Gateway, type SaveState } from '../src/admin/persistence';
import { type MenuData } from '../src/data/menu-schema';

const initial: MenuData = { products: [{ id: 'cafe', name: 'Café ☕', description: 'Original', price: null, category: 'cafeteria', group: 'cafe', status: 'disponible', note: 'Conservar', image: 'cookie-cup' }] };
function fixture() {
  let menu = structuredClone(initial), sha = 'version-1', allow = true, writes = 0, fail = false;
  const events: SaveState[] = [];
  const gateway = installMenuPersistence({
    branch: 'main',
    api: { request: async (_path, options) => {
      if (!allow) throw Object.assign(new Error('Unauthorized'), { status: 401 });
      if (fail) throw new Error('Network failure');
      if (options?.method === 'PUT') {
        const body = JSON.parse(options.body!);
        if (body.sha !== sha) throw Object.assign(new Error('Conflict'), { status: 409 });
        menu = JSON.parse(Buffer.from(body.content, 'base64').toString('utf8'));
        writes++; sha = `version-${writes + 1}`;
        return { content: { sha } };
      }
      return { sha, encoding: 'base64', content: Buffer.from(JSON.stringify(menu)).toString('base64') };
    } },
  } as Gateway, event => events.push(event));
  return { gateway, events, get menu() { return menu; }, get writes() { return writes; }, disallow: () => { allow = false; }, fail: (value: boolean) => { fail = value; }, concurrent: () => { sha = 'someone-else'; } };
}
const entry = (menu: MenuData) => ({ dataFiles: [{ path: MENU_PATH, raw: JSON.stringify(menu) }], assets: [] });
test('el gateway deniega lectura y escritura sin autorización; no hay almacenamiento alternativo', async () => {
  const f = fixture(); f.disallow();
  await assert.rejects(f.gateway.getEntry(MENU_PATH), /Unauthorized/);
  await assert.rejects(f.gateway.persistEntry(entry(initial), { commitMessage: 'test' }), /Abre la carta/);
  assert.equal(f.writes, 0);
  const second = fixture(); await second.gateway.getEntry(MENU_PATH); second.disallow();
  await assert.rejects(second.gateway.persistEntry(entry(initial), { commitMessage: 'test' }), /No se pudo guardar/);
  assert.equal(second.writes, 0);
});
test('guarda UTF-8, null, metadata y orden; persiste al volver a abrir', async () => {
  const f = fixture(); await f.gateway.getEntry(MENU_PATH);
  const edited = structuredClone(initial); edited.products[0].name = 'Café nuevo';
  await f.gateway.persistEntry(entry(edited), { commitMessage: 'Actualizar carta' });
  const loaded = await f.gateway.getEntry(MENU_PATH) as { data: string };
  assert.deepEqual(JSON.parse(loaded.data), edited);
  assert.equal(f.events.some(e => e.phase === 'saved'), true);
  assert.equal(await menuHash(edited), await menuHash(JSON.parse(loaded.data)));
  assert.equal(f.menu.products[0].price, null);
});
test('SHA rechaza cambios concurrentes incluso después de refrescar el listado', async () => {
  const f = fixture(); await f.gateway.getEntry(MENU_PATH); f.concurrent();
  await f.gateway.entriesByFiles([{ path: MENU_PATH }]);
  await assert.rejects(f.gateway.persistEntry(entry(initial), { commitMessage: 'test' }), /Conflicto/);
  assert.equal(f.writes, 0);
});
test('fallo de red permite reintentar el mismo formulario y evita guardados duplicados', async () => {
  const f = fixture(); await f.gateway.getEntry(MENU_PATH); f.fail(true);
  await assert.rejects(f.gateway.persistEntry(entry(initial), { commitMessage: 'test' }));
  f.fail(false);
  const first = f.gateway.persistEntry(entry(initial), { commitMessage: 'test' });
  await assert.rejects(f.gateway.persistEntry(entry(initial), { commitMessage: 'test' }), /curso/);
  await first;
  assert.equal(f.writes, 1);
});
test('validación bloquea publicación inválida y cambios de notas o imágenes', async () => {
  const f = fixture(); await f.gateway.getEntry(MENU_PATH);
  for (const patch of [{ price: -1 }, { group: 'pasteles' }, { note: 'borrada' }, { image: undefined }]) {
    const menu = structuredClone(initial); Object.assign(menu.products[0], patch);
    await assert.rejects(f.gateway.persistEntry(entry(menu), { commitMessage: 'test' }));
  }
  await assert.rejects(f.gateway.deleteFiles([MENU_PATH], 'test'));
  await assert.rejects(f.gateway.persistMedia({}));
  assert.equal(f.writes, 0);
});
test('eliminar y crear solo cambia el producto correspondiente', async () => {
  const f = fixture(); await f.gateway.entriesByFiles([{ path: MENU_PATH }]);
  const menu = structuredClone(initial);
  menu.products.push({ id: 'producto-123', name: 'Nuevo', description: '', price: 0, category: 'comida', group: 'pasteles', status: 'oculto' });
  await f.gateway.persistEntry(entry(menu), { commitMessage: 'Crear' });
  menu.products = menu.products.filter(p => p.id !== 'producto-123');
  await f.gateway.persistEntry(entry(menu), { commitMessage: 'Eliminar' });
  assert.deepEqual(f.menu, initial);
});
