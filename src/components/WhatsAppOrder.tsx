import { useEffect, useRef, useState } from 'react';
import { menuGroups, categories } from '../data/menu-config';
import { formatPrice } from '../data/menu-format';
import { canOrder } from '../data/menu-schema';
import { addOrderLine, createOrderLine, getOrder, orderLineKey, orderMessage, type OrderItem, type OrderLine, type OrderProduct, type OrderSelections } from '../lib/order';
import { business, whatsappReady } from '../data/business';
import ProductOptionsDialog from './ProductOptionsDialog';

export default function WhatsAppOrder({ products }: { products: OrderProduct[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [pending, setPending] = useState<{ product: OrderProduct; opener: HTMLElement | null; item?: OrderItem } | null>(null);
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
    previousFocus.current?.focus({ preventScroll: true });
  }

  function addProduct(id: string, opener: HTMLElement | null, item?: OrderItem) {
    const product = products.find((item) => item.id === id);
    if (!product || !canOrder(product)) return;
    if (product.options?.length) { setPending({ product, opener, item }); return; }
    setLines(current => addOrderLine(current, product));
    setAnnouncement(`${product.name} agregado a tu pedido.`);
  }

  function confirmOptions(selections: OrderSelections, quantity: number) {
    if (!pending || !createOrderLine(pending.product, selections, quantity)) return;
    setLines(current => addOrderLine(pending.item ? current.filter(line => orderLineKey(line) !== pending.item!.key) : current, pending.product, selections, quantity));
    setAnnouncement(`${pending.product.name} ${pending.item ? 'actualizado en' : 'agregado a'} tu pedido.`);
    setPending(null);
  }

  function changeQuantity(item: OrderItem, delta: number) {
    setLines(current => current.map(line => orderLineKey(line) === item.key ? { ...line, quantity: Math.min(99, Math.max(0, line.quantity + delta)) } : line).filter(line => line.quantity > 0));
  }

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) return;
      const opener = event.target.closest<HTMLElement>('[data-order-open]');
      const add = event.target.closest<HTMLElement>('[data-add-product]');
      if (opener) { event.preventDefault(); openOrder(); }
      if (add?.dataset.addProduct) addProduct(add.dataset.addProduct, add);
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
  }, [announcement, lines]);

  const { order, count, total, hasPendingPrices, hasPricedProducts } = getOrder(products, lines);
  const totalLabel = hasPendingPrices ? (hasPricedProducts ? 'Subtotal conocido' : 'Total por confirmar') : 'Total referencial';
  const totalDisplay = hasPendingPrices ? (hasPricedProducts ? `${formatPrice(total)} + por confirmar` : 'Por confirmar') : formatPrice(total);
  const message = orderMessage(products, lines, business.whatsappMessage, name, notes);
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
            <button type="button" className="button button-red" disabled={!products.some(item => item.id === selected && canOrder(item))} onClick={event => addProduct(selected, event.currentTarget)} aria-label="Agregar producto seleccionado">+</button>
          </div>
        </div>
        {order.length ? <ul className="order-items">
          {order.map((item) => <li key={item.key}>
            <div className="order-item-name"><strong>{item.name}</strong>{item.selectionLabel && <small className="order-item-options">{item.selectionLabel}</small>}<small>{item.description}</small><span>{item.price === null ? 'Precio por confirmar' : formatPrice(item.price * item.quantity)}</span>
              {!!item.options?.length && <button type="button" className="order-edit-options" onClick={event => addProduct(item.id, event.currentTarget, item)}>Cambiar opciones</button>}
            </div>
            <div className="order-quantity">
              <button type="button" aria-label={`Quitar uno de ${item.name}${item.selectionLabel ? `, ${item.selectionLabel}` : ''}`} onClick={() => changeQuantity(item, -1)}>−</button>
              <span aria-label={`${item.quantity} unidades`}>{item.quantity}</span>
              <button type="button" disabled={item.quantity >= 99} aria-label={`Agregar uno de ${item.name}${item.selectionLabel ? `, ${item.selectionLabel}` : ''}`} onClick={() => changeQuantity(item, 1)}>+</button>
              <button type="button" className="remove-item" aria-label={`Eliminar ${item.name}${item.selectionLabel ? `, ${item.selectionLabel}` : ''} del pedido`} onClick={() => setLines(current => current.filter(line => orderLineKey(line) !== item.key))}>Quitar</button>
            </div>
          </li>)}
        </ul> : <p className="empty-order">Tu próxima pausa rica empieza aquí. ☕</p>}
        {order.length > 0 && <div className="order-total"><span>{totalLabel}</span><strong>{hasPricedProducts ? formatPrice(total) : 'Por confirmar'}</strong></div>}
        {hasPendingPrices && <p className="pending-total-note">{hasPricedProducts ? 'El subtotal no incluye los productos con precio pendiente. El total se confirma al pedir.' : 'Los precios de estos productos y el total se confirman al pedir.'}</p>}
        <label className="order-field" htmlFor="customer-name">Tu nombre <span>(opcional)</span>
          <input id="customer-name" autoComplete="given-name" maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="¿Cómo te llamas?" />
        </label>
        <label className="order-field" htmlFor="order-notes">¿Algo que debamos saber? <span>(opcional)</span>
          <textarea id="order-notes" rows={2} maxLength={400} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Sin azúcar, horario de retiro u otra indicación…" />
        </label>
        {!whatsappReady && <p className="demo-notice" id="demo-order-note">Estás viendo una demo. El WhatsApp de Fusión x8 está pendiente de confirmar: {business.whatsappDisplay}. Por ahora no se envían pedidos.</p>}
        {whatsappReady ? <a className="button button-red order-send" href={orderUrl} target="_blank" rel="noopener noreferrer">{order.length ? 'Enviar pedido por WhatsApp' : 'Consultar por WhatsApp'} <span aria-hidden="true">↗</span></a>
          : <button type="button" className="button button-red order-send" disabled aria-describedby="demo-order-note">WhatsApp pendiente de configurar</button>}
        <p className="order-footnote">Precios de la carta vigente, sujetos a confirmación. La disponibilidad y el retiro se coordinan por WhatsApp.</p>
      </dialog>
      {pending && <ProductOptionsDialog product={pending.product} opener={pending.opener} initialSelections={pending.item?.selections} initialQuantity={pending.item?.quantity} editing={!!pending.item} onConfirm={confirmOptions} onCancel={() => setPending(null)} />}
    </div>
  );
}
