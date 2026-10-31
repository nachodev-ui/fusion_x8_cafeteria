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
type State = { search: string; category: string; status: string; editing: string | null; deleting: string | null; dirty: boolean; save: SaveState };
interface Instance {
  props: { value?: ProductData[] | { toJS: () => ProductData[] }; onChange: (value: ProductData[]) => void };
  state: State;
  setState: (state: Partial<State>) => void;
  beforeUnload: (event: BeforeUnloadEvent) => void;
  onSaveState: (event: Event) => void;
}
export const adminEvents = new EventTarget();
let saveState: SaveState = { phase: 'ready', message: 'Carta cargada desde el repositorio.' };
export function notifySave(state: SaveState) {
  saveState = state;
  adminEvents.dispatchEvent(new CustomEvent('save', { detail: state }));
}
const items = (self: Instance): ProductData[] => {
  const value = self.props.value;
  return Array.isArray(value) ? value : value?.toJS() ?? [];
};
function change(self: Instance, products: ProductData[]) {
  self.props.onChange(products);
  self.setState({ dirty: true });
}
function update(self: Instance, id: string, patch: Partial<ProductData>) {
  change(self, items(self).map(item => item.id === id ? { ...item, ...patch } : item));
}
const labelStatus = (status: string) => ({ disponible: 'Disponible', agotado: 'Agotado', oculto: 'Oculto' })[status] ?? status;

export function makeProductWidget({ h, createClass }: WidgetRuntime) {
  const option = (value: string, label: string) => h('option', { value, key: value }, label);
  const button = (label: string, onClick: () => void, props = {}) => h('button', { type: 'button', onClick, ...props }, label);
  return createClass({
    getInitialState: () => ({ search: '', category: '', status: '', editing: null, deleting: null, dirty: false, save: saveState }),
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
      let error = '';
      try { parseMenu({ products }); } catch (exception) { error = (exception as Error).message; }
      const field = (label: string, id: string, control: unknown) => h('label', { className: 'fusion-field', htmlFor: id }, label, control);
      const edit = product ? h('section', { className: 'fusion-editor', 'aria-label': `Editar ${product.name || 'producto nuevo'}` },
        h('h3', null, product.name || 'Producto nuevo'),
        h('p', null, 'Los cambios permanecen sin guardar hasta pulsar «Guardar» en el gestor.'),
        field('Nombre', 'product-name', h('input', { id: 'product-name', value: product.name, required: true, maxLength: 120, onChange: (e: Event) => update(this, product.id, { name: (e.target as HTMLInputElement).value }), onBlur: () => update(this, product.id, { name: product.name.trim() }) })),
        field('Descripción', 'product-description', h('textarea', { id: 'product-description', value: product.description, maxLength: 1000, rows: 3, onChange: (e: Event) => update(this, product.id, { description: (e.target as HTMLTextAreaElement).value }) })),
        field('Precio por confirmar', 'price-pending', h('input', { id: 'price-pending', type: 'checkbox', checked: product.price === null, onChange: (e: Event) => update(this, product.id, { price: (e.target as HTMLInputElement).checked ? null : Number.NaN }) })),
        product.price === null ? h('p', null, 'Se guardará null. El pedido pedirá confirmar el precio.') : field('Precio entero en CLP', 'product-price', h('input', { id: 'product-price', type: 'number', min: 0, max: 1_000_000_000, step: 1, required: true, value: Number.isFinite(product.price) ? product.price : '', onChange: (e: Event) => update(this, product.id, { price: (e.target as HTMLInputElement).valueAsNumber }) })),
        field('Categoría', 'product-category', h('select', { id: 'product-category', value: product.category, onChange: (e: Event) => update(this, product.id, { category: (e.target as HTMLSelectElement).value as ProductData['category'], group: '' as ProductData['group'] }) }, option('', 'Selecciona categoría'), ...categories.map(item => option(item.id, item.label)))),
        field('Grupo', 'product-group', h('select', { id: 'product-group', required: true, value: product.group, onChange: (e: Event) => update(this, product.id, { group: (e.target as HTMLSelectElement).value as ProductData['group'] }) }, option('', 'Selecciona un grupo de esta categoría'), ...menuGroups.filter(item => item.category === product.category).map(item => option(item.id, item.label)))),
        field('Estado', 'product-status', h('select', { id: 'product-status', value: product.status, onChange: (e: Event) => update(this, product.id, { status: (e.target as HTMLSelectElement).value as ProductData['status'] }) }, ...statuses.map(status => option(status, labelStatus(status))))),
        h('p', null, 'Disponible: visible y agregable. Agotado: visible, sin pedidos. Oculto: fuera de la carta y del pedido.'),
        h('small', null, `Identificador estable: ${product.id}. Las notas e imágenes existentes se conservan.`),
        button('Volver al listado', () => this.setState({ editing: null })),
      ) : null;
      return h('div', { className: 'fusion-admin' },
        h('div', { role: this.state.save.phase === 'error' ? 'alert' : 'status', 'aria-live': 'polite', className: 'fusion-status', 'data-phase': this.state.save.phase },
          this.state.dirty && this.state.save.phase !== 'saving' ? h('strong', null, 'Cambios sin guardar. ') : null,
          this.state.dirty && this.state.save.phase === 'saved' ? 'La versión anterior está guardada. Guarda los cambios nuevos para solicitar su publicación.' : this.state.save.message),
        h('p', null, 'Gestiona solo los productos de la carta. Guardar genera un cambio en Git y solicita una publicación de Cloudflare. Promociones y novedades se gestionan por separado.'),
        error ? h('p', { role: 'alert', className: 'fusion-error' }, error) : null,
        h('fieldset', { disabled: this.state.save.phase === 'saving' },
          h('legend', null, 'Administrar productos'),
          h('div', { className: 'fusion-filters' },
            field('Buscar por nombre', 'product-search', h('input', { id: 'product-search', type: 'search', value: this.state.search, onChange: (e: Event) => this.setState({ search: (e.target as HTMLInputElement).value }) })),
            field('Filtrar categoría', 'category-filter', h('select', { id: 'category-filter', value: this.state.category, onChange: (e: Event) => this.setState({ category: (e.target as HTMLSelectElement).value }) }, option('', 'Todas'), ...categories.map(item => option(item.id, item.label)))),
            field('Filtrar estado', 'status-filter', h('select', { id: 'status-filter', value: this.state.status, onChange: (e: Event) => this.setState({ status: (e.target as HTMLSelectElement).value }) }, option('', 'Todos'), ...statuses.map(status => option(status, labelStatus(status))))),
            button('Crear producto', () => {
              const id = `producto-${crypto.randomUUID()}`;
              change(this, [...products, { id, name: '', description: '', price: null, category: 'cafeteria', group: '' as ProductData['group'], status: 'disponible' }]);
              this.setState({ editing: id });
            }),
          ),
          edit,
          h('p', { role: 'status' }, `${filtered.length} de ${products.length} productos`),
          !filtered.length ? h('p', null, products.length ? 'No hay productos que coincidan con los filtros.' : 'La carta está vacía. Crea el primer producto.') : h('ul', { className: 'fusion-products' }, ...filtered.map(item => h('li', { key: item.id },
            h('div', null, h('strong', null, item.name || 'Sin nombre'), h('p', null, `${categories.find(c => c.id === item.category)?.label ?? 'Categoría pendiente'} · ${menuGroups.find(g => g.id === item.group)?.label ?? 'Grupo pendiente'}`), h('span', null, `${item.price === null ? 'Precio por confirmar' : Number.isFinite(item.price) ? formatPrice(item.price) + ' CLP' : 'Precio inválido'} · ${labelStatus(item.status)}`)),
            h('div', { className: 'fusion-actions' }, button('Editar', () => this.setState({ editing: item.id }), { 'aria-label': `Editar ${item.name}` }), button('Eliminar', () => this.setState({ deleting: item.id }), { 'aria-label': `Eliminar ${item.name}` })),
          ))),
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
