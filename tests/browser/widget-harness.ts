// Test-only runtime adapter. No test backend, password or bypass is shipped in /admin.
import React from 'react';
import { createRoot } from 'react-dom/client';
import { makeProductWidget, notifySave } from '../../src/admin/widget';
import { parseMenu, type ProductData } from '../../src/data/menu-schema';
import WhatsAppOrder from '../../src/components/WhatsAppOrder';
import '../../src/admin/admin.css';
const ProductWidget = makeProductWidget({ h: React.createElement, createClass: spec => {
  return class extends React.Component<any, any> {
    constructor(props: any) {
      super(props);
      Object.entries(spec).forEach(([name, value]) => { (this as any)[name] = typeof value === 'function' ? value.bind(this) : value; });
      this.state = spec.getInitialState();
    }
  };
} });
const sample: ProductData[] = [
  { id: 'cafe', name: 'Café prueba', description: 'Original', price: 1900, category: 'cafeteria', group: 'cafe', status: 'disponible', note: 'No perder', image: 'cookie-cup' },
  { id: 'agotado', name: 'Pastel agotado', description: 'Dulce', price: null, category: 'comida', group: 'pasteles', status: 'agotado' },
  { id: 'oculto', name: 'Oculto prueba', description: '', price: 100, category: 'heladeria', group: 'copas', status: 'oculto' },
];
if (new URLSearchParams(location.search).has('many')) {
  for (let index = 0; index < 28; index++) sample.push({ ...sample[0], id: 'extra-' + index, name: 'Producto ' + index });
}
function Harness() {
  const [products, setProducts] = React.useState(sample);
  const [saved, setSaved] = React.useState('');
  const [fail, setFail] = React.useState(false);
  return React.createElement(React.Fragment, null,
    React.createElement(ProductWidget, { value: products, onChange: setProducts }),
    React.createElement('button', { onClick: () => {
      try {
        parseMenu({ products });
        if (fail) { notifySave({ phase: 'error', message: 'No se pudo guardar. Tus cambios siguen en el formulario.' }); return; }
        setSaved(JSON.stringify(products)); notifySave({ phase: 'saved', message: 'Guardado en el repositorio de prueba.', menu: { products } });
      } catch (e) { notifySave({ phase: 'error', message: (e as Error).message }); }
    } }, 'Guardar prueba'),
    React.createElement('label', null, 'Fallar guardado', React.createElement('input', { type: 'checkbox', checked: fail, onChange: e => setFail(e.target.checked) })),
    React.createElement('output', { id: 'saved' }, saved),
    React.createElement(WhatsAppOrder, { products: products.filter(p => p.status !== 'oculto') }),
    React.createElement('button', { 'data-order-open': true }, 'Abrir pedido'),
    React.createElement('button', { 'data-add-product': 'agotado' }, 'Forzar agotado'),
    React.createElement('button', { 'data-add-product': 'oculto' }, 'Forzar oculto'),
  );
}
createRoot(document.getElementById('root')!).render(React.createElement(Harness));
