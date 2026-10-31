import { categories, menuGroups } from '../data/menu-config';
import { formatPrice } from '../data/menu-format';
import { parseMenu, statuses, type ProductData } from '../data/menu-schema';
import type { SaveState } from './persistence';

// Decap renders widgets with its own React instance. Always use its h/createClass
// runtime rather than the public site's React 19 renderer.
export interface WidgetRuntime {
  h: (...args: any[]) => any;
  createClass: (spec: Record<string, any>) => any;
}
type State = { page: number; search: string; category: string; status: string; editing: string | null; deleting: string | null; dirty: boolean; save: SaveState };
interface Instance {
  props: { value?: ProductData[] | { toJS: () => ProductData[] }; onChange: (value: ProductData[]) => void };
  state: State;
  setState: (state: Partial<State>, callback?: () => void) => void;
  beforeUnload: (event: BeforeUnloadEvent) => void;
  onSaveState: (event: Event) => void;
}
export const adminEvents = new EventTarget();
let saveState: SaveState = { phase: 'ready', message: 'Carta cargada desde el repositorio.' };
export function notifySave(state: SaveState) {
  saveState = state;
  adminEvents.dispatchEvent(new CustomEvent('save', { detail: state }));
}
const itemCache = new WeakMap<object, ProductData[]>();
const validationCache = new WeakMap<ProductData[], string>();
const items = (self: Instance): ProductData[] => {
  const value = self.props.value;
  if (!value) return [];
  if (Array.isArray(value)) return value;
  const cached = itemCache.get(value);
  if (cached) return cached;
  const products = value.toJS(); itemCache.set(value, products); return products;
};
function change(self: Instance, products: ProductData[]) {
  self.props.onChange(products);
  self.setState({ dirty: true });
}
function update(self: Instance, id: string, patch: Partial<ProductData>) {
  change(self, items(self).map(item => item.id === id ? { ...item, ...patch } : item));
}
function openEditor(self: Instance, id: string) {
  self.setState({ editing: id }, () => document.getElementById('product-name')?.focus());
}
const labelStatus = (status: string) => ({ disponible: 'Disponible', agotado: 'Agotado', oculto: 'Oculto' })[status] ?? status;

export function makeProductWidget({ h, createClass }: WidgetRuntime, imageSources: Record<string, string> = {}) {
  const option = (value: string, label: string) => h('option', { value, key: value }, label);
  const button = (label: string, onClick: () => void, props = {}) => h('button', { type: 'button', onClick, ...props }, label);
  return createClass({
    getInitialState: () => ({ page: 0, search: '', category: '', status: '', editing: null, deleting: null, dirty: false, save: saveState }),
    componentDidMount(this: Instance) {
      this.beforeUnload = (event: BeforeUnloadEvent) => {
        if (this.state.dirty) event.preventDefault();
      };
      this.onSaveState = (event: Event) => {
        const save = (event as CustomEvent<SaveState>).detail;
        this.setState({ save, ...(save.phase === 'saved' && save.menu ? { dirty: false } : {}) });
      };
      window.addEventListener('beforeunload', this.beforeUnload);
      adminEvents.addEventListener('save', this.onSaveState);
    },
    componentWillUnmount(this: Instance) {
      window.removeEventListener('beforeunload', this.beforeUnload);
      adminEvents.removeEventListener('save', this.onSaveState);
    },
    isValid(this: Instance) {
      try { parseMenu({ products: items(this) }); return true; }
      catch (error) { return { error: { message: (error as Error).message } }; }
    },
    render(this: Instance) {
      const products = items(this);
      const product = products.find(item => item.id === this.state.editing);
      const deleting = products.find(item => item.id === this.state.deleting);
      const filtered = products.filter(item => item.name.toLocaleLowerCase('es').includes(this.state.search.toLocaleLowerCase('es')) && (!this.state.category || item.category === this.state.category) && (!this.state.status || item.status === this.state.status));
      let error = validationCache.get(products);
      if (error === undefined) {
        error = '';
        try { parseMenu({ products }); } catch (exception) { error = (exception as Error).message; }
        validationCache.set(products, error);
      }
      const pageSize = 12;
      const page = Math.min(this.state.page, Math.max(0, Math.ceil(filtered.length / pageSize) - 1));
      const pageItems = filtered.slice(page * pageSize, (page + 1) * pageSize);
      const field = (label: string, id: string, control: unknown) => h('label', { className: 'fusion-field', htmlFor: id }, label, control);
      const edit = product ? h('section', { className: 'fusion-editor', 'aria-label': `Editar ${product.name || 'producto nuevo'}` },
        h('div', { className: 'fusion-editor-heading' }, h('div', null, h('span', { className: 'fusion-kicker' }, 'DETALLES DEL PRODUCTO'), h('h3', null, product.name || 'Producto nuevo')), button('Cerrar', () => this.setState({ editing: null }), { 'aria-label': 'Cerrar edición' })),
        h('p', { className: 'fusion-help' }, 'Edita los datos y guarda la carta cuando termines.'),
        field('Nombre', 'product-name', h('input', { id: 'product-name', value: product.name, required: true, maxLength: 120, onChange: (e: Event) => update(this, product.id, { name: (e.target as HTMLInputElement).value }), onBlur: () => update(this, product.id, { name: product.name.trim() }) })),
        field('Descripción', 'product-description', h('textarea', { id: 'product-description', value: product.description, maxLength: 1000, rows: 3, onChange: (e: Event) => update(this, product.id, { description: (e.target as HTMLTextAreaElement).value }) })),
        field('Precio por confirmar', 'price-pending', h('input', { id: 'price-pending', type: 'checkbox', checked: product.price === null, onChange: (e: Event) => update(this, product.id, { price: (e.target as HTMLInputElement).checked ? null : Number.NaN }) })),
        product.price === null ? h('p', { className: 'fusion-help' }, 'El precio se consultará al local al pedir.') : field('Precio entero en CLP', 'product-price', h('input', { id: 'product-price', type: 'number', min: 0, max: 1_000_000_000, step: 1, required: true, value: Number.isFinite(product.price) ? product.price : '', onChange: (e: Event) => update(this, product.id, { price: (e.target as HTMLInputElement).valueAsNumber }) })),
        field('Categoría', 'product-category', h('select', { id: 'product-category', value: product.category, onChange: (e: Event) => update(this, product.id, { category: (e.target as HTMLSelectElement).value as ProductData['category'], group: '' as ProductData['group'] }) }, option('', 'Selecciona categoría'), ...categories.map(item => option(item.id, item.label)))),
        field('Grupo', 'product-group', h('select', { id: 'product-group', required: true, value: product.group, onChange: (e: Event) => update(this, product.id, { group: (e.target as HTMLSelectElement).value as ProductData['group'] }) }, option('', 'Selecciona un grupo de esta categoría'), ...menuGroups.filter(item => item.category === product.category).map(item => option(item.id, item.label)))),
        field('Estado', 'product-status', h('select', { id: 'product-status', value: product.status, onChange: (e: Event) => update(this, product.id, { status: (e.target as HTMLSelectElement).value as ProductData['status'] }) }, ...statuses.map(status => option(status, labelStatus(status))))),
        h('p', null, 'Disponible: visible y agregable. Agotado: visible, sin pedidos. Oculto: fuera de la carta y del pedido.'),
        h('small', { className: 'fusion-help' }, 'Las imágenes y notas existentes se conservan.'),
        button('Volver al listado', () => this.setState({ editing: null })),
      ) : null;
      return h('div', { className: 'fusion-admin' },
        h('div', { className: 'fusion-page-heading' }, h('div', null, h('span', { className: 'fusion-kicker' }, 'CARTA · FUSIÓN X8'), h('h2', null, 'Tu carta, ', h('em', null, 'al día.')), h('p', null, 'Tus productos, sus precios y lo que hay disponible hoy.'))),
        h('div', { role: this.state.save.phase === 'error' ? 'alert' : 'status', 'aria-live': 'polite', className: 'fusion-status', 'data-phase': this.state.save.phase },
          this.state.dirty && this.state.save.phase !== 'saving' ? h('strong', null, 'Cambios sin guardar. ') : null,
          this.state.dirty && this.state.save.phase === 'saved' ? 'La versión anterior está guardada. Guarda los cambios nuevos para solicitar su publicación.' : this.state.save.message),
        error ? h('p', { role: 'alert', className: 'fusion-error' }, error) : null,
        h('fieldset', { disabled: this.state.save.phase === 'saving' },
          h('legend', { className: 'fusion-sr-only' }, 'Administrar productos'),
          h('div', { className: 'fusion-filters' },
            field('Buscar por nombre', 'product-search', h('input', { id: 'product-search', type: 'search', value: this.state.search, onChange: (e: Event) => this.setState({ search: (e.target as HTMLInputElement).value, page: 0 }) })),
            field('Filtrar categoría', 'category-filter', h('select', { id: 'category-filter', value: this.state.category, onChange: (e: Event) => this.setState({ category: (e.target as HTMLSelectElement).value, page: 0 }) }, option('', 'Todas'), ...categories.map(item => option(item.id, item.label)))),
            field('Filtrar estado', 'status-filter', h('select', { id: 'status-filter', value: this.state.status, onChange: (e: Event) => this.setState({ status: (e.target as HTMLSelectElement).value, page: 0 }) }, option('', 'Todos'), ...statuses.map(status => option(status, labelStatus(status))))),
            button('Crear producto', () => {
              const id = `producto-${crypto.randomUUID()}`;
              change(this, [...products, { id, name: '', description: '', price: null, category: 'cafeteria', group: '' as ProductData['group'], status: 'disponible' }]);
              this.setState({ search: '', category: '', status: '', page: Math.floor(products.length / 12) });
              openEditor(this, id);
            }, { className: 'fusion-primary' }),
          ),
          h('div', { className: product ? 'fusion-workspace is-editing' : 'fusion-workspace' },
          h('section', { className: 'fusion-catalog', 'aria-label': 'Listado de productos' },
          h('div', { className: 'fusion-catalog-heading' }, h('h3', null, 'Productos'), h('span', { role: 'status' }, `${filtered.length} de ${products.length} productos`)),
          !filtered.length ? h('div', { className: 'fusion-empty' }, h('h3', null, products.length ? 'No encontramos productos' : 'Tu carta empieza aquí'), h('p', null, products.length ? 'Prueba otro nombre o cambia los filtros.' : 'Crea el primer producto para comenzar.')) : h('ul', { className: 'fusion-products' }, ...pageItems.map(item => h('li', { key: item.id, 'data-status': item.status, className: item.id === product?.id ? 'is-selected' : '' },
            h('div', { className: 'fusion-product-thumb', 'aria-hidden': true }, item.image && imageSources[item.image] ? h('img', { src: imageSources[item.image], alt: '', width: 56, height: 56, loading: 'lazy', decoding: 'async' }) : h('span', null, item.name.trim().slice(0, 1) || '+')),
            h('div', { className: 'fusion-product-copy' }, h('strong', null, item.name || 'Sin nombre'), h('p', null, `${categories.find(c => c.id === item.category)?.label ?? 'Categoría pendiente'} · ${menuGroups.find(g => g.id === item.group)?.label ?? 'Grupo pendiente'}`), h('span', { className: 'fusion-price' }, item.price === null ? 'Precio por confirmar' : Number.isFinite(item.price) ? formatPrice(item.price) + ' CLP' : 'Precio inválido')),
            h('label', { className: 'fusion-quick-status', 'data-status': item.status }, h('span', { className: 'fusion-sr-only' }, `Estado de ${item.name}`), h('select', { value: item.status, 'aria-label': `Estado de ${item.name}`, onChange: (e: Event) => update(this, item.id, { status: (e.target as HTMLSelectElement).value as ProductData['status'] }) }, ...statuses.map(status => option(status, labelStatus(status))))),
            h('div', { className: 'fusion-actions' }, button('Editar', () => openEditor(this, item.id), { 'aria-label': `Editar ${item.name}` }), button('×', () => this.setState({ deleting: item.id }), { className: 'fusion-delete', 'aria-label': `Eliminar ${item.name}`, title: 'Eliminar producto' })),
          ))),
          filtered.length > pageSize ? h('nav', { className: 'fusion-pagination', 'aria-label': 'Páginas de productos' }, h('span', null, `${page * pageSize + 1}–${Math.min((page + 1) * pageSize, filtered.length)} de ${filtered.length}`), button('Anterior', () => this.setState({ page: page - 1 }), { disabled: page === 0 }), button('Siguiente', () => this.setState({ page: page + 1 }), { disabled: (page + 1) * pageSize >= filtered.length })) : null,
          ), edit),
          deleting ? h('dialog', { className: 'fusion-confirm', 'aria-labelledby': 'delete-title', ref: (node: HTMLDialogElement | null) => { if (node && !node.open) node.showModal(); }, onCancel: () => this.setState({ deleting: null }) },
            h('h3', { id: 'delete-title' }, `Eliminar «${deleting.name || 'Sin nombre'}»`),
            h('p', null, 'Se quitará únicamente este producto al guardar. Si solo quieres retirarlo temporalmente, cambia su estado a Oculto.'),
            button('Cancelar', () => this.setState({ deleting: null }), { autoFocus: true }),
            button('Eliminar', () => { change(this, products.filter(item => item.id !== deleting.id)); this.setState({ deleting: null, editing: this.state.editing === deleting.id ? null : this.state.editing }); }),
          ) : null,
        ),
      );
    },
  });
}
