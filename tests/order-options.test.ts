import { test } from 'node:test';
import assert from 'node:assert/strict';
import data from '../src/data/products.json';
import { parseMenu, menuSignatureInput, type ProductData } from '../src/data/menu-schema';
import { addOrderLine, createOrderLine, getOrder, orderMessage, selectionError, type OrderSelections } from '../src/lib/order';

const products = parseMenu(data).products;
const juice = products.find(product => product.id === 'jugos')!;
test('no se añade un producto sin completar una elección válida', () => {
  const invalid: OrderSelections[] = [{}, { sabor: '' }, { sabor: '   ' }, { sabor: 'Inventado' }, { sabor: 'Piña', extra: 'Gratis' }];
  for (const selections of invalid) {
    assert.equal(createOrderLine(juice, selections), null);
    assert.deepEqual(addOrderLine([], juice, selections), []);
  }
  assert.equal(getOrder(products, { jugos: 1 }).count, 0);
});
test('sabores distintos no se mezclan; repetir una combinación suma solo esa línea', () => {
  const lines = addOrderLine(addOrderLine(addOrderLine([], juice, { sabor: 'Piña' }), juice, { sabor: 'Frambuesa' }), juice, { sabor: 'Piña' }, 2);
  const result = getOrder(products, lines);
  assert.equal(result.order.length, 2);
  assert.equal(result.count, 4);
  assert.equal(result.total, 15600);
  assert.deepEqual(result.order.map(item => [item.selections.sabor, item.quantity]), [['Piña', 3], ['Frambuesa', 1]]);
  const message = orderMessage(products, lines, 'Hola');
  assert.match(message, /3 × Jugos \(Sabor: Piña\) — \$3\.900 c\/u/);
  assert.match(message, /1 × Jugos \(Sabor: Frambuesa\) — \$3\.900 c\/u/);
});
test('preferencias escritas y varias elecciones son obligatorias y se conservan en WhatsApp', () => {
  const waffle = products.find(product => product.id === 'waffle')!;
  assert.ok(selectionError(waffle, { base: 'Manjar', fruta: 'Frutilla' }));
  const selections = { base: 'Manjar', fruta: 'Plátano y frutilla', 'helado-1': '  Chocolate   amargo  ' };
  const line = createOrderLine(waffle, selections)!;
  assert.equal(line.selections['helado-1'], 'Chocolate amargo');
  assert.match(orderMessage(products, [line], 'Hola'), /Base: Manjar · Fruta: Plátano y frutilla · Sabor de helado: Chocolate amargo/);
  assert.equal(createOrderLine(waffle, { ...selections, 'helado-1': 'x'.repeat(81) }), null);
  const triple = products.find(product => product.id === 'barquillo-triple')!;
  assert.equal(createOrderLine(triple, { 'helado-1': 'Vainilla', 'helado-2': 'Chocolate' }), null);
});
test('las opciones no cambian precios ni permiten productos agotados o cantidades inválidas', () => {
  assert.equal(createOrderLine({ ...juice, status: 'agotado' }, { sabor: 'Piña' }), null);
  for (const quantity of [0, -1, 100, 1.5, NaN]) assert.equal(createOrderLine(juice, { sabor: 'Piña' }, quantity), null);
  const lines = addOrderLine(addOrderLine([], juice, { sabor: 'Piña' }, 99), juice, { sabor: 'Piña' });
  assert.equal(getOrder(products, lines).count, 99);
  const pending = { ...juice, price: null };
  const pendingOrder = getOrder([pending], [createOrderLine(pending, { sabor: 'Piña' })!]);
  assert.equal(pendingOrder.hasPendingPrices, true);
  assert.equal(pendingOrder.hasPricedProducts, false);
});
test('validación y versión incluyen las opciones y rechazan listas inválidas', () => {
  const base = { ...juice, options: undefined } as ProductData;
  assert.notEqual(menuSignatureInput({ products: [juice] }), menuSignatureInput({ products: [base] }));
  for (const options of [null, [{ id: 'sabor', label: '', choices: ['Piña'] }], [{ id: 'sabor', label: 'Sabor', choices: [] }], [{ id: 'sabor', label: 'Sabor', choices: ['Piña', 'Piña'] }], [{ id: 'sabor', label: 'Sabor', choices: ['Piña'], price: 1 }]]) {
    assert.throws(() => parseMenu({ products: [{ ...juice, options }] }));
  }
});
