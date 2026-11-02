import { canOrder, type ProductData } from '../data/menu-schema';
import { formatPrice } from '../data/menu-format';
export type OrderProduct = Omit<ProductData, 'image'>;

export function getOrder(products: OrderProduct[], quantities: Record<string, number>) {
  const order = products.filter(item => canOrder(item) && Number.isInteger(quantities[item.id]) && quantities[item.id] > 0 && quantities[item.id] <= 99);
  return {
    order,
    count: order.reduce((sum, item) => sum + quantities[item.id], 0),
    total: order.reduce((sum, item) => item.price === null ? sum : sum + quantities[item.id] * item.price, 0),
    hasPendingPrices: order.some(item => item.price === null),
    hasPricedProducts: order.some(item => item.price !== null),
  };
}

export function orderMessage(products: OrderProduct[], quantities: Record<string, number>, intro: string, name = '', notes = '') {
  const { order, total, hasPendingPrices, hasPricedProducts } = getOrder(products, quantities);
  return [intro, ...(name.trim() ? [`Soy ${name.trim()}.`] : []), ...(order.length ? [
    '', ...order.map(item => `• ${quantities[item.id]} × ${item.name} — ${item.price === null ? 'precio por confirmar' : `${formatPrice(item.price)} c/u`}`), '',
    ...(hasPricedProducts ? [`${hasPendingPrices ? 'Subtotal con precio conocido' : 'Total'}: ${formatPrice(total)}`] : []),
    ...(hasPendingPrices ? ['Hay productos con precio pendiente. ¿Me confirman sus precios y el total final?'] : []),
  ] : []), ...(notes.trim() ? ['', `Comentario: ${notes.trim()}`] : []), '', '¿Me confirman disponibilidad y cómo coordinar el retiro? ¡Gracias!'].join('\n');
}
