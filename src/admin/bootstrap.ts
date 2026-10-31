import { cmsConfig, type BridgeConfig } from './config';
import { installMenuPersistence, menuHash, type Gateway, type SaveState } from './persistence';
import { makeProductWidget, notifySave, type WidgetRuntime } from './widget';
import { parseMenu } from '../data/menu-schema';

interface CmsLocale {
  editor: { editorToolbar: Record<string, string>; editor: { onPublishing: string } };
  ui: { toast: Record<string, string> };
}
interface CmsRuntime {
  getLocale: (name: string) => CmsLocale;
  registerLocale: (name: string, phrases: unknown) => void;
  getBackend: (name: string) => { init: (config: unknown, options: unknown) => Gateway };
  registerBackend: (name: string, constructor: unknown) => void;
  registerWidget: (name: string, widget: unknown) => void;
  registerMediaLibrary: (library: unknown) => void;
  registerEventListener: (listener: { name: string; handler: (args: { entry: { get: (key: string) => { toJS: () => unknown } } }) => void }) => void;
  init: (options: { config: unknown }) => void;
}
declare global { interface Window extends WidgetRuntime { CMS?: CmsRuntime; CMS_MANUAL_INIT?: boolean } }

let generation = 0;
async function notify(state: SaveState) {
  notifySave(state);
  if (state.phase === 'saving' || state.phase === 'error') generation++;
  if (state.phase !== 'saved' || !state.menu) return;
  const current = ++generation;
  const expected = await menuHash(state.menu);
  // Verify the exact menu in the deployed artifact, never infer success from Save.
  for (let attempt = 0; attempt < 60 && current === generation; attempt++) {
    try {
      const response = await fetch(`/menu-version.json?check=${Date.now()}`, { cache: 'no-store' });
      if (response.ok && (await response.json()).version === expected && current === generation) {
        notifySave({ phase: 'saved', message: 'Cambios guardados en el repositorio y disponibles en la web. Versión de carta verificada.' });
        return;
      }
    } catch { /* Keep the saved form intact while the deployment is unavailable. */ }
    await new Promise(resolve => window.setTimeout(resolve, 5000));
  }
  if (current === generation) notifySave({ phase: 'saved', message: 'Guardado en el repositorio. Aún no se confirmó esta versión en la web. Puede estar en cola o haber fallado la compilación; pide al responsable técnico revisar Cloudflare. No repitas el guardado para publicarla.' });
}

export function startAdmin(bridge: BridgeConfig) {
  const cms = window.CMS;
  if (!cms) return;
  const original = cms.getBackend('git-gateway');
  const es = structuredClone(cms.getLocale('es'));
  Object.assign(es.editor.editorToolbar, { publish: 'Guardar y solicitar publicación', publishing: 'Guardando en Git…', published: 'Guardado en Git', publishNow: 'Guardar y solicitar publicación' });
  es.editor.editor.onPublishing = '¿Guardar la carta en Git y solicitar su publicación? Los cambios aparecerán cuando termine el despliegue.';
  Object.assign(es.ui.toast, { entryPublished: 'Carta guardada en Git. Espera a que termine la publicación.', entrySaved: 'Carta guardada en Git.' });
  cms.registerLocale('fusion-es', es);
  // Wrap the official backend: login, logout, PKCE and token refresh remain Decap's.
  cms.registerBackend('fusion-git-gateway', class {
    constructor(config: unknown, options: unknown) {
      return installMenuPersistence(original.init(config, options), state => { void notify(state); });
    }
  });
  cms.registerWidget('fusion-products', makeProductWidget(window));
  cms.registerMediaLibrary({ name: 'disabled', init: () => ({ show() {}, hide() {}, enableStandalone: () => false }) });
  cms.registerEventListener({ name: 'preSave', handler: ({ entry }) => { parseMenu(entry.get('data').toJS()); } });
  document.querySelector('#admin-boot')?.remove();
  cms.init({ config: { ...cmsConfig(bridge), locale: 'fusion-es' } });
}
