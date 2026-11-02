import { useState } from 'react';
import type { ProductOption } from '../data/menu-schema';

export default function ProductOptionEditor({ options, validation, onChange }: { options: ProductOption[]; validation: string; onChange: (options: ProductOption[]) => void }) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const update = (index: number, patch: Partial<ProductOption>) => onChange(options.map((option, i) => i === index ? { ...option, ...patch } : option));
  return <section className="fusion-edit-section" aria-labelledby="options-heading">
    <div className="fusion-section-title"><span aria-hidden="true">06</span><div><h2 id="options-heading">Sabores y preferencias</h2><p>El cliente debe completar cada elección antes de agregar este producto.</p></div></div>
    <div className="fusion-option-editor">
      {options.map((option, index) => <div className="fusion-option-fields" key={option.id}>
        <div className="fusion-option-heading"><strong>Elección {index + 1}</strong><button type="button" className="fusion-back" onClick={() => onChange(options.filter((_, i) => i !== index))}>Quitar elección</button></div>
        <label className="fusion-field" htmlFor={`${option.id}-label`}>Nombre de la elección<input id={`${option.id}-label`} required maxLength={80} value={option.label} placeholder="Ej. Sabor" onChange={event => update(index, { label: event.target.value })} /></label>
        <label className="fusion-field" htmlFor={`${option.id}-mode`}>Tipo de respuesta<select id={`${option.id}-mode`} value={option.choices ? 'choices' : 'text'} onChange={event => update(index, { choices: event.target.value === 'choices' ? (drafts[option.id] ?? '').split('\n').map(choice => choice.trim()).filter(Boolean) : undefined })}><option value="choices">Lista de opciones</option><option value="text">Preferencia escrita</option></select></label>
        {option.choices && <label className="fusion-field" htmlFor={`${option.id}-choices`}>Opciones, una por línea<textarea id={`${option.id}-choices`} rows={4} maxLength={2430} value={drafts[option.id] ?? option.choices.join('\n')} placeholder={'Piña\nFrambuesa\nFrutilla'} onChange={event => {
          const value = event.target.value;
          setDrafts(current => ({ ...current, [option.id]: value }));
          update(index, { choices: value.split('\n').map(choice => choice.trim()).filter(Boolean) });
        }} /></label>}
        <label className="fusion-field" htmlFor={`${option.id}-hint`}>Ayuda para el cliente (opcional)<input id={`${option.id}-hint`} maxLength={200} value={option.hint ?? ''} onChange={event => update(index, { hint: event.target.value })} /></label>
        {option.choices?.length === 0 && <p className="fusion-field-error">Añade al menos una opción a la lista.</p>}
      </div>)}
      <button type="button" className="fusion-back" disabled={options.length >= 8} onClick={() => onChange([...options, { id: `opcion-${crypto.randomUUID().slice(0, 8)}`, label: 'Sabor', choices: [] }])}>+ Añadir elección</button>
      {validation && <p className="fusion-field-error" role="status">{validation}</p>}
      <p className="fusion-help">Hasta 8 elecciones. Usa una lista para variedades confirmadas o una preferencia escrita si el local debe confirmar la disponibilidad. No cambia el precio.</p>
    </div>
  </section>;
}
