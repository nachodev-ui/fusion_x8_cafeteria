import { parseMenu, menuSignatureInput, type MenuData } from '../data/menu-schema';

export const MENU_PATH = 'src/data/products.json';
export type SaveState = { phase: 'loading' | 'ready' | 'saving' | 'saved' | 'error'; message: string; menu?: MenuData };
type GitFile = { sha: string; content: string; encoding: string };
type Entry = { dataFiles: { path: string; raw: string }[]; assets: unknown[] };
export interface Gateway {
  api?: { request: (path: string, options?: { method?: string; body?: string; cache?: RequestCache }) => Promise<unknown> };
  branch: string;
  getEntry: (path: string) => Promise<unknown>;
  entriesByFiles: (files: { path: string }[]) => Promise<unknown>;
  persistEntry: (entry: Entry, options: { commitMessage: string }) => Promise<unknown>;
  persistMedia: (...args: unknown[]) => Promise<unknown>;
  deleteFiles: (...args: unknown[]) => Promise<unknown>;
}
const decode = (content: string) => new TextDecoder().decode(Uint8Array.from(atob(content.replace(/\s/g, '')), char => char.charCodeAt(0)));
const encode = (content: string) => btoa(Array.from(new TextEncoder().encode(content), byte => String.fromCharCode(byte)).join(''));
export async function menuHash(menu: MenuData) {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(menuSignatureInput(menu)));
  return Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
}

// Keep Decap's maintained authentication. Only adapt file persistence to GitHub's
// atomic Contents API: the SHA belongs to the document the editor actually read.
// No pre-save "check then unconditional write" race and no PAT in the browser.
export function installMenuPersistence(gateway: Gateway, notify: (state: SaveState) => void) {
  let baseline: { sha: string; menu: MenuData } | undefined;
  let saving = false;
  const deny = async (): Promise<never> => { throw new Error('Esta versión solo permite editar la carta, sin archivos multimedia ni eliminación de la carta completa.'); };
  const read = async () => {
    if (!gateway.api) throw new Error('Debes iniciar sesión para consultar la carta.');
    const file = await gateway.api.request(`/contents/${MENU_PATH}?ref=${encodeURIComponent(gateway.branch)}`, { cache: 'no-store' }) as GitFile;
    if (!file.sha || file.encoding !== 'base64') throw new Error('No se pudo leer la versión del repositorio.');
    const raw = decode(file.content);
    const menu = parseMenu(JSON.parse(raw));
    return { file: { path: MENU_PATH, id: file.sha }, data: raw, sha: file.sha, menu };
  };
  gateway.getEntry = async path => {
    if (path !== MENU_PATH) return deny();
    notify({ phase: 'loading', message: 'Cargando carta desde el repositorio…' });
    try {
      const result = await read();
      baseline = { sha: result.sha, menu: result.menu };
      notify({ phase: 'ready', message: 'Carta cargada del repositorio. Los cambios se guardan con «Guardar».' });
      return { file: result.file, data: result.data };
    } catch (error) {
      notify({ phase: 'error', message: 'No se pudo cargar la carta. Reintenta desde el gestor.' });
      throw error;
    }
  };
  gateway.entriesByFiles = async files => {
    if (files.length !== 1 || files[0].path !== MENU_PATH) return deny();
    // Listing refreshes must never change the version of an open form.
    const result = await read();
    baseline ??= { sha: result.sha, menu: result.menu };
    return [{ file: result.file, data: result.data }];
  };
  gateway.persistEntry = async (entry, options) => {
    if (saving) throw new Error('Ya hay un guardado en curso. Espera su resultado.');
    if (!baseline || !gateway.api) throw new Error('Abre la carta desde el repositorio antes de guardar.');
    if (entry.dataFiles.length !== 1 || entry.dataFiles[0].path !== MENU_PATH || entry.assets.length) return deny();
    saving = true;
    notify({ phase: 'saving', message: 'Guardando en el repositorio… No cierres esta página.' });
    try {
      const menu = parseMenu(JSON.parse(entry.dataFiles[0].raw));
      for (const product of menu.products) {
        const previous = baseline.menu.products.find(item => item.id === product.id);
        if (product.image !== previous?.image || product.note !== previous?.note) throw new Error('Las notas e imágenes existentes deben conservarse. No se editan desde este panel.');
      }
      const result = await gateway.api.request(`/contents/${MENU_PATH}`, {
        method: 'PUT', body: JSON.stringify({
          message: options.commitMessage, branch: gateway.branch, sha: baseline.sha,
          content: encode(JSON.stringify(menu, null, 2) + '\n'),
        }),
      }) as { content: { sha: string } };
      baseline = { sha: result.content.sha, menu };
      notify({ phase: 'saved', message: 'Cambios guardados en el repositorio. Publicación solicitada; aparecerán cuando Cloudflare termine de compilar.', menu });
      return result;
    } catch (error) {
      const status = (error as { status?: number }).status;
      const message = status === 409 || status === 422
        ? 'Conflicto: cambió la carta en el repositorio. Tus cambios siguen en el formulario. Copia tus cambios y vuelve a abrir la carta antes de reintentarlos.'
        : 'No se pudo guardar. Tus cambios siguen en el formulario. Revisa la conexión y la sesión antes de reintentar. Si la respuesta se perdió, vuelve a abrir la carta para comprobar si se guardó.';
      notify({ phase: 'error', message });
      throw new Error(`${message} ${error instanceof Error ? error.message : ''}`);
    } finally { saving = false; }
  };
  gateway.persistMedia = deny;
  gateway.deleteFiles = deny;
  return gateway;
}
