import { useEffect, useRef, useState } from 'react';
import { formatPrice } from '../data/menu-format';
import { selectionError, type OrderProduct, type OrderSelections } from '../lib/order';
import '../styles/product-options.css';

export default function ProductOptionsDialog({ product, opener, initialSelections = {}, initialQuantity = 1, editing = false, onConfirm, onCancel }: {
  product: OrderProduct; opener: HTMLElement | null; initialSelections?: OrderSelections; initialQuantity?: number; editing?: boolean;
  onConfirm: (selections: OrderSelections, quantity: number) => void; onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [selections, setSelections] = useState<OrderSelections>(initialSelections);
  const [quantity, setQuantity] = useState(initialQuantity);
  const options = product.options ?? [];
  const error = selectionError(product, selections);
  const complete = options.filter(option => selections[option.id]?.trim()).length;
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    dialog.current!.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.current?.close();
      document.body.style.overflow = previousOverflow;
      const returnTo = opener?.isConnected ? opener : document.querySelector<HTMLButtonElement>('.order-dialog[open] .close-button');
      returnTo?.focus({ preventScroll: true });
    };
  }, [opener]);
  return <dialog ref={dialog} className="product-options-dialog" aria-labelledby="product-options-title" aria-describedby="product-options-intro"
    onCancel={event => { event.preventDefault(); onCancel(); }}>
    <form onSubmit={event => { event.preventDefault(); if (!error && quantity >= 1 && quantity <= 99) onConfirm(selections, quantity); }}>
      <header className="product-options-heading">
        <div><p className="eyebrow">A TU GUSTO</p><h2 id="product-options-title">{product.name}</h2><strong>{formatPrice(product.price)}</strong></div>
        <button type="button" className="close-button" aria-label="Cerrar opciones sin agregar" onClick={onCancel}>×</button>
      </header>
      <div className="product-options-body">
        <p id="product-options-intro">{product.description}</p>
        {options.map(option => <fieldset key={option.id} className="product-option-group">
          <legend>{option.label}<span>Obligatorio</span></legend>
          {option.hint && <p className="product-option-hint" id={`option-help-${option.id}`}>{option.hint}</p>}
          {option.choices ? <div className="product-option-choices">
            {option.choices.map(choice => <label className="product-option-choice" key={choice}>
              <input type="radio" name={option.id} value={choice} required checked={selections[option.id] === choice}
                onChange={() => setSelections(current => ({ ...current, [option.id]: choice }))} />
              <span>{choice}</span><span className="product-option-mark" aria-hidden="true"></span>
            </label>)}
          </div> : <input className="product-option-text" aria-label={option.label} aria-describedby={option.hint ? `option-help-${option.id}` : undefined}
            type="text" required maxLength={80} value={selections[option.id] ?? ''} placeholder="Escribe tu preferencia"
            onChange={event => setSelections(current => ({ ...current, [option.id]: event.target.value }))} />}
        </fieldset>)}
        <div className="product-option-quantity"><span>Cantidad</span><div>
          <button type="button" aria-label="Reducir cantidad" disabled={quantity <= 1} onClick={() => setQuantity(current => current - 1)}>−</button>
          <output aria-label="Cantidad seleccionada">{quantity}</output>
          <button type="button" aria-label="Aumentar cantidad" disabled={quantity >= 99} onClick={() => setQuantity(current => current + 1)}>+</button>
        </div></div>
      </div>
      <footer className="product-options-footer">
        <p aria-live="polite">{error ? `${complete} de ${options.length} elecciones completas. Elige antes de agregar.` : 'Todo listo. Confirma para guardar tu elección.'}</p>
        <div><button type="button" className="button button-outline" onClick={onCancel}>Cancelar</button>
          <button type="submit" className="button button-red" disabled={!!error}>{editing ? 'Guardar cambios' : 'Agregar al pedido'} · {formatPrice(product.price === null ? null : product.price * quantity)}</button></div>
      </footer>
    </form>
  </dialog>;
}
