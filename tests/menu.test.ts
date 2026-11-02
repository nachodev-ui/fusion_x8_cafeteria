import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseMenu, canOrder, isVisible, getVisibleMenu, menuSignatureInput, type ProductData } from '../src/data/menu-schema';
import { getOrder, orderMessage } from '../src/lib/order';
import data from '../src/data/products.json';

const product: ProductData = { id: 'prueba', name: 'Café', description: 'Descripción nueva', category: 'cafeteria', group: 'cafe', price: 1900, status: 'disponible' };
test('datos reales válidos y null conserva su significado', () => {
  assert.equal(parseMenu(data).products.length, data.products.length);
  assert.equal(parseMenu({ products: [{ ...product, price: null }] }).products[0].price, null);
  assert.equal(parseMenu({ products: [{ ...product, price: 0 }] }).products[0].price, 0);
});
test('rechaza datos que romperían la carta o sus relaciones', () => {
  for (const patch of [
    { name: '' }, { name: '  ' }, { name: ' Café ' }, { name: 'a'.repeat(121) },
    { description: 'x'.repeat(1001) }, { price: -1 }, { price: 1.5 }, { price: NaN },
    { price: Infinity }, { price: '' }, { price: '1900' }, { price: undefined }, { price: 1_000_000_001 },
    { category: 'otra' }, { category: 'comida', group: 'cafe' }, { group: '' },
    { status: 'otro' }, { status: undefined }, { id: '../archivo' }, { image: 'https://otro.cl/foto' },
    { note: 123 }, { unknown: true },
  ]) assert.throws(() => parseMenu({ products: [{ ...product, ...patch }] }), JSON.stringify(patch));
  assert.throws(() => parseMenu({ products: [product, product] }));
  assert.throws(() => parseMenu({ products: null }));
  assert.deepEqual(parseMenu({ products: [] }), { products: [] });
});
test('disponibilidad protege la selección, el cálculo y el mensaje incluso ante cantidades manipuladas', () => {
  const menu: ProductData[] = [product, { ...product, id: 'agotado', status: 'agotado' }, { ...product, id: 'oculto', status: 'oculto' }, { ...product, id: 'pendiente', price: null }];
  assert.deepEqual(menu.filter(isVisible).map(p => p.id), ['prueba', 'agotado', 'pendiente']);
  assert.deepEqual(menu.filter(canOrder).map(p => p.id), ['prueba', 'pendiente']);
  const quantities = { prueba: 2, agotado: 3, oculto: 4, eliminado: 9, pendiente: 1 };
  const order = getOrder(menu, quantities);
  assert.equal(order.count, 3);
  assert.equal(order.total, 3800);
  assert.equal(order.hasPendingPrices, true);
  const message = orderMessage(menu.map(p => ({ ...p, name: p.id })), quantities, 'Hola');
  assert.doesNotMatch(message, /Descripción nueva/);
  assert.match(message, /2 × prueba — \$1\.900 c\/u/);
  assert.match(message, /Subtotal con precio conocido: \$3\.800/);
  assert.match(orderMessage([product], { prueba: 2 }, 'Hola'), /2 × Café — \$1\.900 c\/u\n\nTotal: \$3\.800/);
  assert.match(message, /Subtotal con precio conocido/);
  assert.match(message, /precio por confirmar/);
  assert.doesNotMatch(message, /agotado|oculto|eliminado/);
  for (const quantity of [-1, 0, 100, 1.5, NaN]) assert.equal(getOrder(menu, { prueba: quantity }).count, 0);
});
test('solo pendientes y carta vacía no generan total ficticio', () => {
  const pending = getOrder([{ ...product, price: null }], { prueba: 2 });
  assert.equal(pending.hasPricedProducts, false);
  assert.equal(pending.hasPendingPrices, true);
  assert.doesNotMatch(orderMessage([{ ...product, price: null }], { prueba: 1 }, 'Hola'), /Total:|\$0/);
  assert.deepEqual(getOrder([], { prueba: 1 }).order, []);
});
test('ocultar el último producto retira grupos y categorías de la navegación pública', () => {
  const view = getVisibleMenu([product, { ...product, id: 'pastel', category: 'comida', group: 'pasteles', status: 'oculto' }]);
  assert.deepEqual(view.categories.map(c => c.id), ['cafeteria']);
  assert.deepEqual(view.groups.map(g => g.id), ['cafe']);
  const empty = getVisibleMenu([{ ...product, status: 'oculto' }]);
  assert.equal(empty.products.length + empty.categories.length + empty.groups.length, 0);
  const soldOut = getVisibleMenu([{ ...product, status: 'agotado' }]);
  assert.equal(soldOut.products.length, 1);
  assert.equal(getOrder(soldOut.products, { prueba: 1 }).count, 0);
});
test('edición, creación, eliminación y versiones comparten una fuente de datos', () => {
  const edited = { ...product, name: 'Nuevo nombre', description: 'Nueva receta', price: 2100 };
  const menu = parseMenu({ products: [edited, { ...product, id: 'nuevo', category: 'comida', group: 'pasteles', price: null }] });
  const message = orderMessage(menu.products, { prueba: 1, nuevo: 1 }, 'Hola');
  assert.match(message, /Nuevo nombre — \$2\.100 c\/u/);
  assert.doesNotMatch(message, /Nueva receta/);
  assert.equal(getOrder(menu.products, { prueba: 1 }).total, 2100);
  assert.equal(menu.products[1].group, 'pasteles');
  assert.equal(getOrder(menu.products.filter(p => p.id !== 'prueba'), { prueba: 1 }).count, 0);
  assert.notEqual(menuSignatureInput(menu), menuSignatureInput({ products: [product] }));
});
