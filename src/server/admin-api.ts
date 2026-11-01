import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';
import { parseMenu, menuSignatureInput, type MenuData, type ProductData } from '../data/menu-schema';

export interface AdminEnv {
  ADMIN_ORIGIN?: string;
  ADMIN_EMAIL?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  GITHUB_TOKEN?: string;
  GITHUB_REPOSITORY?: string;
  GITHUB_BRANCH?: string;
}
export interface ApiDependencies { fetch?: typeof fetch; keys?: JWTVerifyGetKey }
const MENU_PATH = 'src/data/products.json';
const keySets = new Map<string, JWTVerifyGetKey>();
class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Robots-Tag': 'noindex, nofollow, noarchive',
  } });
}
function configuration(env: AdminEnv) {
  if (!env.ADMIN_ORIGIN || !env.ADMIN_EMAIL || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) throw new ApiError(503, 'NOT_CONFIGURED', 'Falta configurar el acceso del administrador en Cloudflare. Consulta README.md.');
  let origin: URL;
  try { origin = new URL(env.ADMIN_ORIGIN); } catch { throw new ApiError(503, 'NOT_CONFIGURED', 'ADMIN_ORIGIN debe ser una URL válida.'); }
  if (origin.origin !== env.ADMIN_ORIGIN || origin.username || origin.password || (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname)))) throw new ApiError(503, 'NOT_CONFIGURED', 'ADMIN_ORIGIN debe ser el origen HTTPS exacto, sin ruta ni barra final.');
  if (!/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(env.ACCESS_TEAM_DOMAIN) || !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(env.ADMIN_EMAIL)) throw new ApiError(503, 'NOT_CONFIGURED', 'Configura un dominio de equipo válido y un único correo administrador.');
  return { origin: origin.origin, issuer: `https://${env.ACCESS_TEAM_DOMAIN}`, audience: env.ACCESS_AUD, email: env.ADMIN_EMAIL.toLowerCase() };
}
async function identity(request: Request, config: ReturnType<typeof configuration>, deps: ApiDependencies) {
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) throw new ApiError(401, 'UNAUTHENTICATED', 'Inicia sesión para administrar la carta.');
  let keys = deps.keys ?? keySets.get(config.issuer);
  if (!keys) {
    keys = createRemoteJWKSet(new URL(`${config.issuer}/cdn-cgi/access/certs`), { timeoutDuration: 5000, cacheMaxAge: 600_000 });
    keySets.set(config.issuer, keys);
  }
  try {
    const { payload } = await jwtVerify(token, keys, { issuer: config.issuer, audience: config.audience, algorithms: ['RS256'], requiredClaims: ['sub', 'exp', 'iat', 'email'] });
    if (payload.type !== 'app' || typeof payload.email !== 'string' || payload.email.toLowerCase() !== config.email) throw new ApiError(403, 'FORBIDDEN', 'Esta cuenta no está autorizada para administrar la carta.');
    return { email: payload.email, expiresAt: payload.exp! };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if ((error as { code?: string }).code === 'ERR_JWKS_TIMEOUT') throw new ApiError(503, 'IDENTITY_UNAVAILABLE', 'No se pudo consultar el servicio de acceso. Intenta de nuevo.');
    throw new ApiError(401, 'UNAUTHENTICATED', 'La sesión no es válida o venció. Vuelve a iniciar sesión.');
  }
}
async function body(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') throw new ApiError(415, 'INVALID_BODY', 'Envía los cambios como JSON.');
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, 'INVALID_BODY', 'Faltan los datos del producto.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) {
    const chunk = await reader.read(); if (chunk.done) break;
    size += chunk.value.byteLength;
    if (size > 16_384) { await reader.cancel(); throw new ApiError(413, 'INVALID_BODY', 'La solicitud supera el tamaño permitido.'); }
    chunks.push(chunk.value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch { throw new ApiError(400, 'INVALID_BODY', 'El cuerpo JSON no es válido.'); }
}
const requiredEditableKeys = ['name', 'description', 'price', 'category', 'group', 'status'];
const editableKeys = [...requiredEditableKeys, 'tags'];
function editedProduct(value: unknown, base: ProductData): ProductData {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !editableKeys.includes(key)) || requiredEditableKeys.some(key => !Object.hasOwn(value, key))) throw new ApiError(422, 'INVALID_PRODUCT', 'Envía solo los campos editables del producto, completos.');
  const product = { ...base, ...value };
  try { parseMenu({ products: [product] }); } catch (error) { throw new ApiError(422, 'INVALID_PRODUCT', (error as Error).message); }
  return product;
}
const decode = (content: string) => new TextDecoder().decode(Uint8Array.from(atob(content.replace(/\s/g, '')), char => char.charCodeAt(0)));
const encode = (content: string) => btoa(Array.from(new TextEncoder().encode(content), byte => String.fromCharCode(byte)).join(''));
async function hash(menu: MenuData) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(menuSignatureInput(menu)));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}
async function github(env: AdminEnv, deps: ApiDependencies, options?: RequestInit) {
  const repo = env.GITHUB_REPOSITORY || 'nachodev-ui/fusion_x8_cafeteria';
  const branch = env.GITHUB_BRANCH || 'main';
  if (!env.GITHUB_TOKEN || !/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new ApiError(503, 'NOT_CONFIGURED', 'Falta configurar el acceso privado al repositorio.');
  const url = `https://api.github.com/repos/${repo}/contents/${MENU_PATH}${options ? '' : `?ref=${encodeURIComponent(branch)}`}`;
  let response: Response;
  try {
    response = await (deps.fetch ?? fetch)(url, { ...options, signal: AbortSignal.timeout(12_000), headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: 'application/vnd.github.object+json',
      'Content-Type': 'application/json', 'User-Agent': 'fusion-x8-admin', 'X-GitHub-Api-Version': '2022-11-28',
    }, cache: 'no-store' });
  } catch { throw new ApiError(502, options ? 'SAVE_UNCERTAIN' : 'REPOSITORY_UNAVAILABLE', options ? 'Se perdió la respuesta del repositorio. Conservamos el formulario; comprueba si el cambio se guardó antes de repetirlo.' : 'No se pudo conectar con el repositorio. Intenta de nuevo.'); }
  if (response.status === 409 || response.status === 422) throw new ApiError(409, 'CONFLICT', 'La carta cambió en otra sesión. Conservamos tu formulario; carga la versión actual antes de volver a guardar.');
  if (!response.ok) throw new ApiError(502, 'REPOSITORY_UNAVAILABLE', 'El repositorio rechazó la operación. El responsable técnico debe revisar permisos, límites y vencimiento de la credencial.');
  try { return await response.json() as Record<string, unknown>; } catch { throw new ApiError(502, options ? 'SAVE_UNCERTAIN' : 'REPOSITORY_UNAVAILABLE', 'No se pudo interpretar la respuesta del repositorio. Comprueba el estado de la carta antes de reintentar.'); }
}

export async function handleAdminRequest(request: Request, env: AdminEnv, deps: ApiDependencies = {}): Promise<Response> {
  try {
    const config = configuration(env);
    const url = new URL(request.url);
    if (url.origin !== config.origin) throw new ApiError(403, 'FORBIDDEN', 'Este dominio no está autorizado para administrar la carta.');
    const user = await identity(request, config, deps);
    const route = url.pathname.replace(/\/$/, '');
    if (request.method === 'GET' && route === '/api/admin/login') {
      return new Response(null, { status: 303, headers: { Location: `${config.origin}/admin/`, 'Cache-Control': 'no-store' } });
    }
    if (request.method === 'GET' && route === '/api/admin/session') return json({ ...user, logoutUrl: '/cdn-cgi/access/logout' });
    const match = route.match(/^\/api\/admin\/products(?:\/([a-z0-9][a-z0-9-]{0,79}))?$/);
    if (!match) throw new ApiError(404, 'NOT_FOUND', 'Operación inexistente.');
    const id = match[1];
    const readOnly = request.method === 'GET' && !id;
    if (!readOnly && !((request.method === 'POST' && !id) || (['PUT', 'DELETE'].includes(request.method) && id))) throw new ApiError(405, 'METHOD_NOT_ALLOWED', 'Método no permitido.');
    let input: Record<string, unknown> | undefined;
    if (!readOnly) {
      if (request.headers.get('origin') !== config.origin || request.headers.get('sec-fetch-site') === 'cross-site') throw new ApiError(403, 'FORBIDDEN', 'El origen de la solicitud no está autorizado.');
      input = await body(request);
      const allowed = request.method === 'POST' ? ['revision', 'id', 'product'] : request.method === 'PUT' ? ['revision', 'product'] : ['revision'];
      if (Object.keys(input).some(key => !allowed.includes(key)) || typeof input.revision !== 'string' || !/^[a-f0-9]{40,64}$/.test(input.revision)) throw new ApiError(400, 'INVALID_BODY', 'Falta una revisión válida o hay campos no permitidos.');
    }
    const file = await github(env, deps);
    if (typeof file.sha !== 'string' || file.encoding !== 'base64' || typeof file.content !== 'string') throw new ApiError(502, 'REPOSITORY_UNAVAILABLE', 'El archivo de la carta no tiene el formato esperado.');
    let menu: MenuData;
    try { menu = parseMenu(JSON.parse(decode(file.content))); } catch { throw new ApiError(502, 'INVALID_REPOSITORY', 'La carta del repositorio no supera la validación. El responsable técnico debe corregirla.'); }
    if (readOnly) return json({ menu, revision: file.sha, version: await hash(menu) });
    const index = menu.products.findIndex(product => product.id === (id ?? input!.id));
    if (request.method === 'POST') {
      if (typeof input!.id !== 'string' || !/^producto-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(input!.id)) throw new ApiError(422, 'INVALID_PRODUCT', 'El identificador de creación debe ser un UUID nuevo.');
      const product = editedProduct(input!.product, { id: input!.id } as ProductData);
      if (index >= 0) {
        if (menuSignatureInput({ products: [menu.products[index]] }) === menuSignatureInput({ products: [product] })) return json({ menu, revision: file.sha, version: await hash(menu), alreadySaved: true });
        throw new ApiError(409, 'CONFLICT', 'Ese producto ya existe con otros datos. Carga la carta actual.');
      }
      menu.products.push(product);
    } else {
      if (index < 0) throw new ApiError(409, 'CONFLICT', 'El producto fue eliminado en otra sesión. Carga la carta actual.');
      if (request.method === 'DELETE') menu.products.splice(index, 1);
      else menu.products[index] = editedProduct(input!.product, menu.products[index]);
    }
    if (input!.revision !== file.sha) throw new ApiError(409, 'CONFLICT', 'La carta cambió en otra sesión. Conservamos tu formulario; carga la versión actual antes de volver a guardar.');
    try { parseMenu(menu); } catch (error) { throw new ApiError(422, 'INVALID_PRODUCT', (error as Error).message); }
    const result = await github(env, deps, { method: 'PUT', body: JSON.stringify({
      branch: env.GITHUB_BRANCH || 'main', sha: file.sha, content: encode(JSON.stringify(menu, null, 2) + '\n'),
      message: `${request.method === 'POST' ? 'Crear' : request.method === 'DELETE' ? 'Eliminar' : 'Actualizar'} producto de la carta`,
    }) });
    const content = result.content as { sha?: string } | undefined;
    if (!content?.sha) throw new ApiError(502, 'SAVE_UNCERTAIN', 'El repositorio no devolvió una revisión. Comprueba si el cambio quedó guardado antes de reintentar.');
    return json({ menu, revision: content.sha, version: await hash(menu) });
  } catch (error) {
    if (error instanceof ApiError) return json({ code: error.code, message: error.message }, error.status);
    return json({ code: 'INTERNAL_ERROR', message: 'No se pudo completar la operación. Conserva los cambios y vuelve a intentarlo.' }, 500);
  }
}
