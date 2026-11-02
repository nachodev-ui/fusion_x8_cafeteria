import { canOrder, type ProductData } from '../data/menu-schema';
import { formatPrice } from '../data/menu-format';
export type OrderProduct = Omit<ProductData, 'image'>;
export type OrderSelections = Record<string, string>;
export interface OrderLine { productId: string; quantity: number; selections: OrderSelections }
export type OrderItem = OrderProduct & OrderLine & { key: string; selectionLabel: string };

const clean = (value: string) => value.trim().replace(/\s+/g, ' ');
export function selectionError(product: OrderProduct, selections: OrderSelections) {
  const options = product.options ?? [];
  if (Object.keys(selections).some(id => !options.some(option => option.id === id))) return 'Hay una opción que no corresponde al producto.';
  for (const option of options) {
    const raw = selections[option.id];
    if (typeof raw !== 'string' || !clean(raw)) return `Completa ${option.label.toLocaleLowerCase('es')}.`;
    if (clean(raw).length > 80 || (option.choices && !option.choices.includes(clean(raw)))) return `Revisa ${option.label.toLocaleLowerCase('es')}.`;
  }
  return '';
}
export function createOrderLine(product: OrderProduct, selections: OrderSelections = {}, quantity = 1): OrderLine | null {
  if (!canOrder(product) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99 || selectionError(product, selections)) return null;
  return { productId: product.id, quantity, selections: Object.fromEntries((product.options ?? []).map(option => [option.id, clean(selections[option.id])])) };
}
export const orderLineKey = (line: OrderLine) => JSON.stringify([line.productId, Object.entries(line.selections).sort(([a], [b]) => a.localeCompare(b))]);
export function addOrderLine(lines: OrderLine[], product: OrderProduct, selections: OrderSelections = {}, quantity = 1) {
  const next = createOrderLine(product, selections, quantity);
  if (!next) return lines;
  const key = orderLineKey(next);
  return lines.some(line => orderLineKey(line) === key)
    ? lines.map(line => orderLineKey(line) === key ? { ...line, quantity: Math.min(99, line.quantity + quantity) } : line)
    : [...lines, next];
}

export function getOrder(products: OrderProduct[], input: OrderLine[] | Record<string, number>) {
  // The former quantity map remains valid; configurable products still require their choices.
  const lines: OrderLine[] = Array.isArray(input) ? input : Object.entries(input).map(([productId, quantity]) => ({ productId, quantity, selections: {} }));
  const items = new Map<string, OrderItem>();
  for (const line of lines) {
    const product = products.find(item => item.id === line.productId);
    if (!product || !line.selections || typeof line.selections !== 'object' || Array.isArray(line.selections)) continue;
    const valid = createOrderLine(product, line.selections, line.quantity);
    if (!valid) continue;
    const key = orderLineKey(valid);
    const selectionLabel = (product.options ?? []).map(option => `${option.label}: ${valid.selections[option.id]}`).join(' · ');
    const previous = items.get(key);
    items.set(key, { ...product, ...valid, key, selectionLabel, quantity: Math.min(99, (previous?.quantity ?? 0) + valid.quantity) });
  }
  const order = [...items.values()];
  return {
    order,
    count: order.reduce((sum, item) => sum + item.quantity, 0),
    total: order.reduce((sum, item) => item.price === null ? sum : sum + item.quantity * item.price, 0),
    hasPendingPrices: order.some(item => item.price === null),
    hasPricedProducts: order.some(item => item.price !== null),
  };
}

export function orderMessage(products: OrderProduct[], lines: OrderLine[] | Record<string, number>, intro: string, name = '', notes = '') {
  const { order, total, hasPendingPrices, hasPricedProducts } = getOrder(products, lines);
  return [intro, ...(name.trim() ? [`Soy ${name.trim()}.`] : []), ...(order.length ? [
    '', ...order.map(item => `• ${item.quantity} × ${item.name}${item.selectionLabel ? ` (${item.selectionLabel})` : ''} — ${item.price === null ? 'precio por confirmar' : `${formatPrice(item.price)} c/u`}`), '',
    ...(hasPricedProducts ? [`${hasPendingPrices ? 'Subtotal con precio conocido' : 'Total'}: ${formatPrice(total)}`] : []),
    ...(hasPendingPrices ? ['Hay productos con precio pendiente. ¿Me confirman sus precios y el total final?'] : []),
  ] : []), ...(notes.trim() ? ['', `Comentario: ${notes.trim()}`] : []), '', '¿Me confirman disponibilidad y cómo coordinar el retiro? ¡Gracias!'].join('\n');
}
