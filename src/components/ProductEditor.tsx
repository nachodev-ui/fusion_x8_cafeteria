import { useEffect, useRef, useState } from 'react';
import { categories, menuGroups } from '../data/menu-config';
import { formatPrice } from '../data/menu-format';
import { statuses, dietaryTags, dietaryTagLabels, type ProductData } from '../data/menu-schema';

const labels = { disponible: 'Disponible', agotado: 'Agotado', oculto: 'Oculto' };
const descriptions = { disponible: 'Visible en la carta. Se puede añadir al pedido.', agotado: 'Visible con etiqueta Agotado. No permite pedidos.', oculto: 'Fuera de la carta y del selector del pedido.' };
interface Props {
  product: ProductData; isNew: boolean; dirty: boolean; saving: boolean; validation: string;
  missing: boolean; conflict: boolean; original?: ProductData; image?: string; loading: boolean;
  patch: (value: Partial<ProductData>) => void; cancel: () => void;
  save: (event: { preventDefault: () => void }) => void; reload: () => void;
}
export default function ProductEditor({ product, isNew, dirty, saving, validation, missing, conflict, original, image, loading, patch, cancel, save, reload }: Props) {
  const name = useRef<HTMLInputElement>(null);
  const [touched, setTouched] = useState<string[]>([]);
  useEffect(() => { name.current?.focus({ preventScroll: true }); window.scrollTo(0, 0); }, []);
  const errorField = validation.includes('nombre') ? 'product-name' : validation.includes('precio') ? 'product-price' : validation.includes('grupo') ? 'product-group' : '';
  const error = (field: string) => errorField === field && touched.includes(field) ? validation.replace(/^Producto \d+: /, '') : '';
  const price = product.price === null ? 'Precio por confirmar' : Number.isSafeInteger(product.price) && product.price >= 0 && product.price <= 1_000_000_000 ? `${formatPrice(product.price)} CLP` : 'Introduce un precio válido';
  const category = categories.find(item => item.id === product.category)?.label;
  const group = menuGroups.find(item => item.id === product.group)?.label;
  return <form className="fusion-product-editor" aria-label={isNew ? 'Crear producto' : `Editar ${product.name}`} onSubmit={save}
    onBlur={event => { const id = event.target.id; if (id) setTouched(current => current.includes(id) ? current : [...current, id]); }}>
    <header className="fusion-edit-heading"><button type="button" className="fusion-back" disabled={saving} onClick={cancel}>← Volver a productos</button><span className="fusion-kicker">TU CARTA · CADA DETALLE CUENTA</span><h1>{isNew ? 'Crear' : 'Editar'} <em>producto.</em></h1><p>Un buen antojo empieza por cómo lo presentas.</p></header>
    <div className="fusion-edit-layout"><fieldset className="fusion-edit-fields" disabled={saving}>
      <section className="fusion-edit-section" aria-labelledby="info-heading">
        <div className="fusion-section-title"><span aria-hidden="true">01</span><div><h2 id="info-heading">Información del producto</h2><p>Así lo conocerán tus clientes.</p></div></div>
        <div className="fusion-section-fields">
          <label className="fusion-field" htmlFor="product-name">Nombre<input ref={name} id="product-name" required maxLength={120} placeholder="Ej. Latte de vainilla" value={product.name} aria-invalid={!!error('product-name')} aria-describedby="name-feedback" onChange={event => patch({ name: event.target.value })} /></label><small id="name-feedback" className={error('product-name') ? 'fusion-field-error' : 'fusion-help'}>{error('product-name') || 'El nombre que aparecerá en la carta.'}</small>
          <label className="fusion-field" htmlFor="product-description">Descripción<textarea id="product-description" maxLength={1000} rows={4} placeholder="Ingredientes, sabor o preparación…" value={product.description} aria-describedby="description-count" onChange={event => patch({ description: event.target.value })} /></label><small id="description-count" className="fusion-character-count">Opcional <span>{product.description.length}/1000</span></small>
        </div>
      </section>
      <section className="fusion-edit-section" aria-labelledby="price-heading">
        <div className="fusion-section-title"><span aria-hidden="true">02</span><div><h2 id="price-heading">Precio</h2><p>En pesos chilenos, sin decimales.</p></div></div>
        <div className="fusion-section-fields"><label className="fusion-price-toggle" htmlFor="price-pending"><span><strong>Precio por confirmar</strong><small>Actívalo si aún debes confirmar el valor.</small></span><input id="price-pending" aria-label="Precio por confirmar" type="checkbox" checked={product.price === null} onChange={event => patch({ price: event.target.checked ? null : Number.NaN })} /></label>
          {product.price === null ? <p className="fusion-pending-hint">Se mostrará «Por confirmar». No se sumará como cero al pedido.</p> : <><label className="fusion-field" htmlFor="product-price">Precio entero en CLP<span className="fusion-money-input"><span aria-hidden="true">$</span><input id="product-price" aria-label="Precio entero en CLP" type="number" required min={0} max={1_000_000_000} step={1} inputMode="numeric" placeholder="Ej. 3500" value={Number.isFinite(product.price) ? product.price : ''} aria-invalid={!!error('product-price')} aria-describedby="price-feedback" onChange={event => patch({ price: event.target.valueAsNumber })} /><span aria-hidden="true">CLP</span></span></label><small id="price-feedback" className="fusion-field-error">{error('product-price')}</small></>}
        </div>
      </section>
      <section className="fusion-edit-section" aria-labelledby="category-heading">
        <div className="fusion-section-title"><span aria-hidden="true">03</span><div><h2 id="category-heading">Ubicación en la carta</h2><p>Ayuda a encontrarlo en el lugar correcto.</p></div></div>
        <div className="fusion-section-fields"><div className="fusion-form-grid">
          <label className="fusion-field" htmlFor="product-category">Categoría<select id="product-category" value={product.category} onChange={event => { patch({ category: event.target.value as ProductData['category'], group: '' as ProductData['group'] }); setTouched(current => [...current, 'product-group']); }}>{categories.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label className="fusion-field" htmlFor="product-group">Grupo<select id="product-group" required value={product.group} aria-invalid={!!error('product-group')} aria-describedby="group-feedback" onChange={event => patch({ group: event.target.value as ProductData['group'] })}><option value="">Selecciona un grupo</option>{menuGroups.filter(item => item.category === product.category).map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
        </div><small id="group-feedback" className={error('product-group') ? 'fusion-field-error' : 'fusion-help'}>{error('product-group') || 'Si cambias la categoría, selecciona un grupo de nuevo.'}</small></div>
      </section>
      <section className="fusion-edit-section" aria-labelledby="availability-heading">
        <div className="fusion-section-title"><span aria-hidden="true">04</span><div><h2 id="availability-heading">Disponibilidad</h2><p>Decide cómo aparece y si se puede pedir.</p></div></div>
        <fieldset className="fusion-availability"><legend className="fusion-sr-only">Estado del producto</legend>{statuses.map(status => <label key={status} className="fusion-state-card" data-selected={product.status === status}><input type="radio" name="product-status" value={status} aria-label={labels[status]} checked={product.status === status} aria-describedby={`status-help-${status}`} onChange={() => patch({ status })} /><span><strong>{labels[status]}</strong><small id={`status-help-${status}`}>{descriptions[status]}</small></span></label>)}</fieldset>
      </section>
      <section className="fusion-edit-section" aria-labelledby="tags-heading">
        <div className="fusion-section-title"><span aria-hidden="true">05</span><div><h2 id="tags-heading">Etiquetas opcionales</h2><p>Marca solo las que el local haya confirmado para esta preparación.</p></div></div>
        <fieldset className="fusion-dietary-tags"><legend className="fusion-sr-only">Etiquetas del producto</legend>{dietaryTags.map(tag => <label key={tag}><input type="checkbox" checked={product.tags?.includes(tag) ?? false} onChange={event => patch({ tags: event.target.checked ? [...(product.tags ?? []), tag] : (product.tags ?? []).filter(item => item !== tag) })} />{dietaryTagLabels[tag]}</label>)}</fieldset>
      </section>
    </fieldset>
    <aside className="fusion-edit-preview" aria-label="Vista previa del producto"><span className="fusion-kicker">VISTA PREVIA</span><h2>Así se verá tu antojo</h2><p>Una referencia de su contenido en la carta.</p><article className="fusion-preview-card" data-status={product.status}>
      {image && <img src={image} alt="" width="112" height="112" />}<span className="fusion-preview-category">{category} / {group || 'Selecciona un grupo'}</span><h3>{product.name.trim() || 'Nombre del producto'}</h3><p>{product.description || 'La descripción de tu producto aparecerá aquí.'}</p><strong className="fusion-preview-price">{price}</strong><span className="fusion-preview-badge">{labels[product.status]}</span>
    </article>{product.status === 'oculto' && <p className="fusion-preview-note">Este producto estará oculto. La tarjeta es solo una vista previa para ti.</p>}{product.status === 'agotado' && <p className="fusion-preview-note">Los clientes podrán verlo, pero no añadirlo al pedido.</p>}<div className="fusion-preview-footnote">{image ? 'La imagen y las notas existentes se conservan.' : 'Puedes guardar este producto sin imagen.'}<br />Los cambios aparecerán cuando termine la publicación.</div></aside></div>
    {conflict && <div className="fusion-conflict"><strong>Revisa la versión del repositorio</strong><p>{original ? `${original.name} · ${formatPrice(original.price)} · ${labels[original.status]}` : 'Este producto no está en la versión cargada.'}</p><p>Tu formulario se conserva. Carga la versión actual y compara los datos antes de guardar otra vez.</p><button type="button" disabled={loading || saving} onClick={reload}>{loading ? 'Cargando…' : 'Cargar versión actual'}</button></div>}
    <footer className="fusion-edit-footer"><div><strong>{saving ? 'Guardando…' : dirty ? 'Cambios sin guardar' : 'Sin cambios pendientes'}</strong><small>{validation ? 'Completa los campos obligatorios con datos válidos.' : 'Guardar actualizará este producto y solicitará su publicación.'}</small></div><div className="fusion-editor-actions"><button type="button" disabled={saving} onClick={cancel}>Cancelar</button><button type="submit" className="fusion-primary" disabled={saving || !!validation || !dirty || missing}>{saving ? 'Guardando…' : 'Guardar producto'}</button></div></footer>
  </form>;
}
