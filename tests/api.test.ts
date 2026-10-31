import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { handleAdminRequest, type AdminEnv } from '../src/server/admin-api';
import { type MenuData, type ProductData } from '../src/data/menu-schema';

const env: AdminEnv = { ADMIN_ORIGIN: 'https://admin.example.test', ADMIN_EMAIL: 'owner@example.test', ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com', ACCESS_AUD: 'test-app', GITHUB_TOKEN: 'test-server-only', GITHUB_REPOSITORY: 'test/menu' };
const pair = await generateKeyPair('RS256');
const keys = createLocalJWKSet({ keys: [{ ...await exportJWK(pair.publicKey), kid: 'test', alg: 'RS256' }] });
async function token(patch: Record<string, unknown> = {}) {
  return new SignJWT({ email: env.ADMIN_EMAIL, type: 'app', ...patch }).setProtectedHeader({ alg: 'RS256', kid: 'test' }).setIssuer(`https://${env.ACCESS_TEAM_DOMAIN}`).setAudience(env.ACCESS_AUD!).setSubject('owner').setIssuedAt().setExpirationTime('10m').sign(pair.privateKey);
}
const validToken = await token();
const product: ProductData = { id: 'cafe', name: 'Café', description: 'Café de prueba', price: null, category: 'cafeteria', group: 'cafe', status: 'disponible', image: 'cookie-cup', note: 'Conservar nota' };
const editable = ({ id: _id, image: _image, note: _note, ...value }: ProductData) => value;
function fixture() {
  let menu: MenuData = { products: [{ ...product }, { ...product, id: 'otro', name: 'Otro' }] };
  let revision = '1'.repeat(40), writes = 0, reads = 0;
  let failure: 'read' | 'write' | 'race' | null = null;
  const upstream: typeof fetch = async (_url, init) => {
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer test-server-only');
    if (init?.method === 'PUT') {
      if (failure === 'write') throw new Error('network lost');
      if (failure === 'race') return new Response('{}', { status: 409 });
      const input = JSON.parse(String(init.body));
      assert.equal(input.sha, revision);
      assert.equal(input.branch, 'main');
      menu = JSON.parse(Buffer.from(input.content, 'base64').toString('utf8'));
      writes++; revision = String(writes + 1).repeat(40);
      return Response.json({ content: { sha: revision } });
    }
    reads++; if (failure === 'read') throw new Error('network lost');
    return Response.json({ sha: revision, encoding: 'base64', content: Buffer.from(JSON.stringify(menu)).toString('base64') });
  };
  async function request(method = 'GET', path = 'products', input?: unknown, options: { jwt?: string | null; origin?: string; urlOrigin?: string; configuration?: AdminEnv } = {}) {
    const headers = new Headers({ 'Content-Type': 'application/json', Origin: options.origin ?? env.ADMIN_ORIGIN! });
    if (options.jwt !== null) headers.set('Cf-Access-Jwt-Assertion', options.jwt ?? validToken);
    return handleAdminRequest(new Request(`${options.urlOrigin ?? env.ADMIN_ORIGIN}/api/admin/${path}`, { method, headers, ...(input === undefined ? {} : { body: JSON.stringify(input) }) }), options.configuration ?? env, { keys, fetch: upstream });
  }
  return { request, get menu() { return menu; }, get revision() { return revision; }, get writes() { return writes; }, get reads() { return reads; }, fail(value: typeof failure) { failure = value; } };
}

test('API rechaza lectura y escritura sin sesión, token falso, otro correo, audiencia, emisor o expiración', async () => {
  const f = fixture();
  const wrongAudience = await new SignJWT({ email: env.ADMIN_EMAIL, type: 'app' }).setProtectedHeader({ alg: 'RS256', kid: 'test' }).setIssuer(`https://${env.ACCESS_TEAM_DOMAIN}`).setAudience('other-app').setSubject('owner').setIssuedAt().setExpirationTime('10m').sign(pair.privateKey);
  const expired = await new SignJWT({ email: env.ADMIN_EMAIL, type: 'app' }).setProtectedHeader({ alg: 'RS256', kid: 'test' }).setIssuer(`https://${env.ACCESS_TEAM_DOMAIN}`).setAudience(env.ACCESS_AUD!).setSubject('owner').setIssuedAt(1).setExpirationTime(2).sign(pair.privateKey);
  const wrongIssuer = await new SignJWT({ email: env.ADMIN_EMAIL, type: 'app' }).setProtectedHeader({ alg: 'RS256', kid: 'test' }).setIssuer('https://other.cloudflareaccess.com').setAudience(env.ACCESS_AUD!).setSubject('owner').setIssuedAt().setExpirationTime('10m').sign(pair.privateKey);
  const unsignedExpiry = await new SignJWT({ email: env.ADMIN_EMAIL, type: 'app' }).setProtectedHeader({ alg: 'RS256', kid: 'test' }).setIssuer(`https://${env.ACCESS_TEAM_DOMAIN}`).setAudience(env.ACCESS_AUD!).setSubject('owner').setIssuedAt().sign(pair.privateKey);
  const otherKey = await generateKeyPair('RS256');
  const forged = await new SignJWT({ email: env.ADMIN_EMAIL, type: 'app' }).setProtectedHeader({ alg: 'RS256', kid: 'test' }).setIssuer(`https://${env.ACCESS_TEAM_DOMAIN}`).setAudience(env.ACCESS_AUD!).setSubject('owner').setIssuedAt().setExpirationTime('10m').sign(otherKey.privateKey);
  for (const jwt of [null, 'fake.token.signature', forged, await token({ email: 'intruder@example.test' }), await token({ type: 'service' }), wrongAudience, wrongIssuer, expired, unsignedExpiry]) {
    for (const method of ['GET', 'POST']) {
      const response = await f.request(method, 'products', method === 'POST' ? {} : undefined, { jwt });
      assert.ok([401, 403].includes(response.status));
      assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
      assert.doesNotMatch(await response.text(), /test-server-only|Conservar nota/);
    }
  }
  assert.equal(f.reads + f.writes, 0);
});

test('configuración incompleta, origen alternativo y CSRF cierran el acceso antes de consultar GitHub', async () => {
  const f = fixture();
  assert.equal((await f.request('GET', 'products', undefined, { configuration: {} })).status, 503);
  assert.equal((await f.request('GET', 'products', undefined, { urlOrigin: 'https://preview.example.test' })).status, 403);
  assert.equal((await f.request('POST', 'products', {}, { origin: 'https://evil.example.test' })).status, 403);
  assert.equal(f.reads + f.writes, 0);
  const session = await (await f.request('GET', 'session')).json();
  assert.equal(session.email, env.ADMIN_EMAIL); assert.equal(session.logoutUrl, '/cdn-cgi/access/logout');
  const login = await f.request('GET', 'login'); assert.equal(login.status, 303); assert.equal(login.headers.get('Location'), `${env.ADMIN_ORIGIN}/admin/`);
});

test('CRUD Git conserva ID, notas, imágenes, orden y null; reabrir obtiene la revisión guardada', async () => {
  const f = fixture();
  const before = await (await f.request()).json();
  const id = 'producto-12345678-1234-4123-8123-123456789abc';
  const created = await f.request('POST', 'products', { revision: before.revision, id, product: { ...editable(product), name: 'Pastel', category: 'comida', group: 'pasteles' } });
  assert.equal(created.status, 200); assert.equal(f.menu.products.at(-1)!.price, null);
  const snapshot = await created.json();
  // A lost response followed by a repeated creation cannot duplicate the product.
  const repeat = await f.request('POST', 'products', { revision: before.revision, id, product: { ...editable(product), name: 'Pastel', category: 'comida', group: 'pasteles' } });
  assert.equal(repeat.status, 200); assert.equal(f.writes, 1);
  const edited = await f.request('PUT', 'products/cafe', { revision: snapshot.revision, product: { ...editable(product), name: 'Nuevo café', price: 0, status: 'agotado' } });
  assert.equal(edited.status, 200);
  assert.deepEqual(f.menu.products[0], { ...product, name: 'Nuevo café', price: 0, status: 'agotado' });
  assert.deepEqual(f.menu.products.map(p => p.id), ['cafe', 'otro', id]);
  assert.equal((await f.request('DELETE', `products/${id}`, { revision: f.revision })).status, 200);
  assert.deepEqual(f.menu.products.map(p => p.id), ['cafe', 'otro']);
  const reopened = await (await f.request()).json();
  assert.equal(reopened.revision, f.revision); assert.deepEqual(reopened.menu, f.menu);
});

test('validación del servidor impide datos inválidos y modificaciones de metadatos protegidos', async () => {
  const f = fixture();
  for (const patch of [{ name: '  ' }, { price: -1 }, { price: 1.5 }, { price: '1900' }, { category: 'comida', group: 'cafe' }, { status: 'inventado' }, { id: 'otro' }, { note: 'borrar' }, { image: 'cinnamon-roll' }]) {
    assert.equal((await f.request('PUT', 'products/cafe', { revision: f.revision, product: { ...editable(product), ...patch } })).status, 422);
  }
  assert.equal((await f.request('POST', 'products', { revision: f.revision, id: '../otro', product: editable(product) })).status, 422);
  assert.equal(f.writes, 0); assert.deepEqual(f.menu.products[0], product);
});

test('revisión antigua y carrera de GitHub devuelven conflicto sin sobrescribir', async () => {
  const f = fixture();
  assert.equal((await f.request('PUT', 'products/cafe', { revision: '0'.repeat(40), product: editable(product) })).status, 409);
  assert.equal((await f.request('DELETE', 'products/cafe', { revision: '0'.repeat(40) })).status, 409);
  f.fail('race');
  assert.equal((await f.request('PUT', 'products/cafe', { revision: f.revision, product: editable(product) })).status, 409);
  assert.equal(f.writes, 0); assert.equal(f.menu.products.length, 2);
});

test('errores de repositorio y respuesta perdida no anuncian guardado ni filtran credenciales', async () => {
  const f = fixture(); f.fail('read');
  assert.equal((await f.request()).status, 502);
  f.fail('write');
  const response = await f.request('PUT', 'products/cafe', { revision: f.revision, product: editable(product) });
  assert.equal(response.status, 502); assert.equal((await response.json()).code, 'SAVE_UNCERTAIN'); assert.equal(f.writes, 0);
});
