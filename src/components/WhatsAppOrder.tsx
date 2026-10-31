import { useEffect, useRef, useState } from 'react';
import { menuGroups, categories } from '../data/menu-config';
import { formatPrice } from '../data/menu-format';
import { canOrder } from '../data/menu-schema';
import { getOrder, orderMessage, type OrderProduct } from '../lib/order';
import { business, whatsappReady } from '../data/business';

export default function WhatsAppOrder({ products }: { products: OrderProduct[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState(products.find(canOrder)?.id ?? '');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const previousFocus = useRef<HTMLElement | null>(null);
  const previousOverflow = useRef('');

  function openOrder() {
    if (!dialog.current || dialog.current.open) return;
    previousFocus.current = document.activeElement as HTMLElement;
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current.showModal();
  }

  function restoreFocus() {
    document.body.style.overflow = previousOverflow.current;
    previousFocus.current?.focus();
  }

  function addProduct(id: string) {
    const product = products.find((item) => item.id === id);
    if (!product || !canOrder(product)) return;
    setQuantities((current) => ({ ...current, [id]: Math.min((current[id] || 0) + 1, 99) }));
    setAnnouncement(`${product.name} agregado a tu pedido.`);
  }

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const opener = event.target.closest<HTMLElement>('[data-order-open]');
      const add = event.target.closest<HTMLElement>('[data-add-product]');
      if (opener) { event.preventDefault(); openOrder(); }
      if (add?.dataset.addProduct) addProduct(add.dataset.addProduct);
    };
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('click', onClick);
      if (dialog.current?.open) document.body.style.overflow = previousOverflow.current;
    };
  }, []);

  useEffect(() => {
    if (!announcement) return;
    const timer = window.setTimeout(() => setAnnouncement(''), 3200);
    return () => window.clearTimeout(timer);
  }, [announcement, quantities]);

  const { order, count, total, hasPendingPrices, hasPricedProducts } = getOrder(products, quantities);
  const totalLabel = hasPendingPrices ? (hasPricedProducts ? 'Subtotal conocido' : 'Total por confirmar') : 'Total referencial';
  const totalDisplay = hasPendingPrices ? (hasPricedProducts ? `${formatPrice(total)} + por confirmar` : 'Por confirmar') : formatPrice(total);
  const message = orderMessage(products, quantities, business.whatsappMessage, name, notes);
  const orderUrl = `https://wa.me/${business.whatsappNumber}?text=${encodeURIComponent(message)}`;

  return (
    <div id="pedido">
      {count > 0 && (
        <button type="button" className="order-basket" onClick={openOrder} aria-label={`Ver mi pedido, ${count} productos, ${totalDisplay}`}>
          <span>Mi pedido</span><span className="basket-count">{count}</span><span>{totalDisplay}</span>
        </button>
      )}
      <div role="status" aria-live="polite" aria-atomic="true" className={announcement ? 'order-toast is-visible' : 'order-toast'}>{announcement}</div>
      <dialog ref={dialog} className="order-dialog" aria-labelledby="order-title" onClose={restoreFocus} onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.current?.close();
      }}>
        <div className="order-heading">
          <div><span className="eyebrow">UN ANTOJO A UN MENSAJE</span><h2 id="order-title" className="script">Tu pedido</h2></div>
          <button type="button" className="close-button" onClick={() => dialog.current?.close()} aria-label="Cerrar pedido">×</button>
        </div>
        <p className="order-intro">Elige algo rico y lo coordinamos por WhatsApp.</p>
        {!products.some(canOrder) && <p role="status">No hay productos disponibles para agregar en este momento. Puedes consultar al local.</p>}
        <div className="order-picker">
          <label htmlFor="order-product">Agrega algo a tu pedido</label>
          <div className="order-picker-row">
            <select id="order-product" disabled={!products.some(canOrder)} value={selected} onChange={(event) => setSelected(event.target.value)}>
              {menuGroups.filter(group => products.some(item => item.group === group.id)).map((group) => <optgroup key={group.id} label={`${categories.find((category) => category.id === group.category)?.label} · ${group.label}`}>
                {products.filter((item) => item.group === group.id).map((item) => <option key={item.id} value={item.id} disabled={!canOrder(item)}>{item.status === 'agotado' ? 'Agotado · ' : ''}{item.name} · {formatPrice(item.price)}</option>)}
              </optgroup>)}
            </select>
            <button type="button" className="button button-red" disabled={!products.some(item => item.id === selected && canOrder(item))} onClick={() => addProduct(selected)} aria-label="Agregar producto seleccionado">+</button>
          </div>
        </div>
        {order.length ? <ul className="order-items">
          {order.map((item) => <li key={item.id}>
            <div className="order-item-name"><strong>{item.name}</strong><small>{item.description}</small><span>{item.price === null ? 'Precio por confirmar' : formatPrice(item.price * quantities[item.id])}</span></div>
            <div className="order-quantity">
              <button type="button" aria-label={`Quitar uno de ${item.name}`} onClick={() => setQuantities((current) => ({ ...current, [item.id]: Math.max(0, current[item.id] - 1) }))}>−</button>
              <span aria-label={`${quantities[item.id]} unidades`}>{quantities[item.id]}</span>
              <button type="button" disabled={quantities[item.id] >= 99} aria-label={`Agregar uno de ${item.name}`} onClick={() => addProduct(item.id)}>+</button>
              <button type="button" className="remove-item" aria-label={`Eliminar ${item.name} del pedido`} onClick={() => setQuantities((current) => ({ ...current, [item.id]: 0 }))}>Quitar</button>
            </div>
          </li>)}
        </ul> : <p className="empty-order">Tu próxima pausa rica empieza aquí. ☕</p>}
        {order.length > 0 && <div className="order-total"><span>{totalLabel}</span><strong>{hasPricedProducts ? formatPrice(total) : 'Por confirmar'}</strong></div>}
        {hasPendingPrices && <p className="pending-total-note">{hasPricedProducts ? 'El subtotal no incluye los productos con precio pendiente. El total se confirma al pedir.' : 'Los precios de estos productos y el total se confirman al pedir.'}</p>}
        <label className="order-field" htmlFor="customer-name">Tu nombre <span>(opcional)</span>
          <input id="customer-name" autoComplete="given-name" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="¿Cómo te llamas?" />
        </label>
        <label className="order-field" htmlFor="order-notes">¿Algo que debamos saber? <span>(opcional)</span>
          <textarea id="order-notes" rows={2} maxLength={400} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Sabores de helado, variedad del jugo, sin azúcar…" />
        </label>
        {!whatsappReady && <p className="demo-notice" id="demo-order-note">Estás viendo una demo. El WhatsApp de Fusión x8 está pendiente de confirmar: {business.whatsappDisplay}. Por ahora no se envían pedidos.</p>}
        {whatsappReady ? <a className="button button-red order-send" href={orderUrl} target="_blank" rel="noopener noreferrer">{order.length ? 'Enviar pedido por WhatsApp' : 'Consultar por WhatsApp'} <span aria-hidden="true">↗</span></a>
          : <button type="button" className="button button-red order-send" disabled aria-describedby="demo-order-note">WhatsApp pendiente de configurar</button>}
        <p className="order-footnote">Precios de la carta vigente, sujetos a confirmación. La disponibilidad y el retiro se coordinan por WhatsApp.</p>
      </dialog>
    </div>
  );
}
