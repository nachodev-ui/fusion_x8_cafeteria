import ProductEditor from './ProductEditor';
import AdminFeedback, { Spinner, type Feedback } from './AdminFeedback';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { categories, menuGroups } from '../data/menu-config';
import { formatPrice } from '../data/menu-format';
import { parseMenu, statuses, type ProductData, type ProductStatus } from '../data/menu-schema';
import { adminRequest, AdminApiError, editableProduct, type AdminSession, type MenuSnapshot } from '../admin/client';

const statusLabels = { disponible: 'Disponible', agotado: 'Agotado', oculto: 'Oculto' };
type Editor = { product: ProductData; isNew: boolean };
type Confirmation = { title: string; message: string; action: string; run: () => void };
const PAGE_SIZE = 12;

function ConfirmDialog({ confirmation, close }: { confirmation: Confirmation | null; close: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (confirmation && !dialog.current?.open) dialog.current?.showModal(); else if (!confirmation) dialog.current?.close(); }, [confirmation]);
  return <dialog ref={dialog} className="fusion-confirm fusion-confirm-designed" aria-labelledby="confirmation-title" aria-describedby="confirmation-description" onCancel={close}>
    {confirmation && <><div className="fusion-confirm-symbol" aria-hidden="true">!</div><span className="fusion-kicker">{confirmation.action === 'Eliminar' ? 'ELIMINAR PRODUCTO' : 'ANTES DE CONTINUAR'}</span><h3 id="confirmation-title">{confirmation.title}</h3><p id="confirmation-description">{confirmation.message}</p><div className="fusion-confirm-note">{confirmation.action === 'Eliminar' ? 'Para una retirada temporal, puedes usar el estado Oculto.' : 'Puedes cancelar y seguir editando. Tus cambios seguirán en el formulario.'}</div><div className="fusion-dialog-actions"><button type="button" autoFocus onClick={close}>Cancelar</button><button type="button" className="fusion-primary" onClick={() => { const action = confirmation.run; close(); action(); }}>{confirmation.action}</button></div></>}
  </dialog>;
}

const ProductRow = memo(function ProductRow({ product, selected, image, busy, edit, remove }: {
  product: ProductData; selected: boolean; image?: string; busy: boolean;
  edit: (product: ProductData, status?: ProductStatus) => void; remove: (product: ProductData) => void;
}) {
  return <li className={selected ? 'is-selected' : ''} data-status={product.status}>
    <div className="fusion-product-thumb" aria-hidden="true">{image ? <img src={image} alt="" width="56" height="56" loading="lazy" decoding="async" /> : <span>{product.name.slice(0, 1)}</span>}</div>
    <div className="fusion-product-copy"><strong>{product.name}</strong><p>{categories.find(item => item.id === product.category)?.label} · {menuGroups.find(item => item.id === product.group)?.label}</p><span className="fusion-price">{product.price === null ? 'Precio por confirmar' : `${formatPrice(product.price)} CLP`}</span></div>
    <label className="fusion-quick-status" data-status={product.status}><span className="fusion-sr-only">Estado de {product.name}</span><select aria-label={`Estado de ${product.name}`} value={product.status} disabled={busy} onChange={event => edit(product, event.target.value as ProductStatus)}>{statuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>
    <div className="fusion-actions"><button type="button" disabled={busy} data-edit-id={product.id} onClick={() => edit(product)} aria-label={`Editar ${product.name}`}>Editar</button><button type="button" className="fusion-delete" disabled={busy} onClick={() => remove(product)} aria-label={`Eliminar ${product.name}`} title="Eliminar producto">×</button></div>
  </li>;
});

export default function AdminPanel({ imageSources = {} }: { imageSources?: Record<string, string> }) {
  const [session, setSession] = useState<AdminSession | null>(null);
  const [checking, setChecking] = useState(true);
  const [snapshot, setSnapshot] = useState<MenuSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [error, setError] = useState('');
  const [authError, setAuthError] = useState(false);
  const [notice, setNotice] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const feedbackId = useRef(0);
  const notify = useCallback((value: Omit<Feedback, 'id'>) => setFeedback({ ...value, id: ++feedbackId.current }), []);
  const dismissFeedback = useCallback((id: number) => setFeedback(current => current?.id === id ? null : current), []);
  const [conflict, setConflict] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [expectedVersion, setExpectedVersion] = useState<string | null>(null);
  const [publicationCheck, setPublicationCheck] = useState(0);
  const [publication, setPublication] = useState<'waiting' | 'live' | 'unconfirmed' | null>(null);
  const returnTo = useRef<string | null>(null);
  const wasEditing = useRef(false);
  const products = snapshot?.menu.products ?? [];
  const original = products.find(product => product.id === editor?.product.id);
  const dirty = !!editor && (editor.isNew || !original || (['name', 'description', 'price', 'category', 'group', 'status'] as const).some(key => !Object.is(editor.product[key], original[key])) || JSON.stringify([...(editor.product.tags ?? [])].sort()) !== JSON.stringify([...(original.tags ?? [])].sort()));
  const dirtyRef = useRef(dirty); dirtyRef.current = dirty;
  const validError = useMemo(() => {
    if (!editor) return '';
    try { parseMenu({ products: [{ ...editor.product, name: editor.product.name.trim() }] }); return ''; }
    catch (exception) { return (exception as Error).message; }
  }, [editor]);
  useEffect(() => {
    if (editor) { wasEditing.current = true; returnTo.current = editor.isNew ? null : editor.product.id; }
    else if (wasEditing.current) {
      wasEditing.current = false;
      const target = returnTo.current ? document.querySelector<HTMLButtonElement>('[data-edit-id="' + returnTo.current + '"]') : null;
      (target ?? document.querySelector<HTMLButtonElement>('.fusion-create-action'))?.focus();
    }
  }, [editor?.product.id]);
  useEffect(() => {
    const beforeLeave = (event: BeforeUnloadEvent) => { if (dirtyRef.current || savingRef.current) event.preventDefault(); };
    window.addEventListener('beforeunload', beforeLeave);
    return () => window.removeEventListener('beforeunload', beforeLeave);
  }, []);

  const reportError = (exception: unknown) => {
    const message = exception instanceof Error ? exception.message : 'No se pudo completar la operación.';
    setError(message);
    notify({ phase: 'error', title: 'No se pudo completar la acción', message });
    setAuthError(exception instanceof AdminApiError && [401, 403].includes(exception.status));
    if (exception instanceof AdminApiError && exception.code === 'CONFLICT') setConflict(true);
  };
  const load = useCallback(async (showFeedback = false) => {
    setLoading(true); setError('');
    if (showFeedback) notify({ phase: 'saving', title: 'Cargando carta', message: 'Consultando la versión actual del repositorio…' });
    try { setSnapshot(await adminRequest<MenuSnapshot>('products')); setNotice('Versión actual cargada.'); if (showFeedback) notify({ phase: 'info', title: 'Carta actualizada', message: 'Se cargó la versión actual. Los cambios del formulario se conservaron.' }); }
    catch (exception) { reportError(exception); }
    finally { setLoading(false); }
  }, []);
  const checkSession = useCallback(async () => {
    setChecking(true); setError('');
    try { const active = await adminRequest<AdminSession>('session'); setSession(active); await load(); }
    catch (exception) { reportError(exception); }
    finally { setChecking(false); }
  }, [load]);
  useEffect(() => { void checkSession(); }, [checkSession]);

  useEffect(() => {
    if (!expectedVersion) return;
    const controller = new AbortController(); let timer: ReturnType<typeof setTimeout>; let attempts = 0;
    const deadline = Date.now() + 300_000;
    setPublication('waiting');
    const check = async () => {
      try {
        const response = await fetch(`/menu-version.json?check=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]) });
        if (response.ok && (await response.json()).version === expectedVersion) {
          if (!controller.signal.aborted) {
            setPublication('live');
            setFeedback(current => current?.version === expectedVersion ? { id: ++feedbackId.current, phase: 'success', title: 'Último guardado publicado', message: 'Verificamos esa versión en la carta pública. Los cambios nuevos sin guardar siguen pendientes.', version: expectedVersion } : current);
          }
          return;
        }
      } catch { /* An unavailable deployment never turns a saved change into a failed save. */ }
      if (controller.signal.aborted) return;
      if (++attempts >= 60 || Date.now() >= deadline) { setPublication('unconfirmed'); setFeedback(current => current?.version === expectedVersion ? { id: ++feedbackId.current, phase: 'info', title: 'Publicación sin confirmar', message: 'El guardado está en el repositorio. Revisa el despliegue de Cloudflare; no necesitas guardar otra vez.' } : current); return; }
      timer = setTimeout(check, 5000);
    };
    void check();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [expectedVersion, publicationCheck]);

  const transition = useCallback((action: () => void) => {
    if (savingRef.current) return;
    if (dirtyRef.current) setConfirmation({ title: 'Hay cambios sin guardar', message: 'El formulario tiene cambios que todavía no están en el repositorio. ¿Quieres descartarlos y continuar?', action: 'Descartar cambios', run: action });
    else action();
  }, []);
  useEffect(() => {
    const home = document.querySelector('[data-admin-home]');
    const goHome = (event: Event) => { const mouse = event as MouseEvent; if (mouse.button !== 0 || mouse.ctrlKey || mouse.metaKey || mouse.shiftKey || mouse.altKey) return; event.preventDefault(); transition(() => setEditor(null)); };
    home?.addEventListener('click', goHome);
    return () => home?.removeEventListener('click', goHome);
  }, [transition]);
  const edit = useCallback((product: ProductData, nextStatus?: ProductStatus) => transition(() => { setEditor({ product: { ...product, ...(nextStatus ? { status: nextStatus } : {}) }, isNew: false }); setError(''); }), [transition]);
  const create = () => transition(() => { setEditor({ product: { id: `producto-${crypto.randomUUID()}`, name: '', description: '', price: null, category: 'cafeteria', group: '' as ProductData['group'], status: 'disponible' }, isNew: true }); setError(''); });
  const patch = (value: Partial<ProductData>) => setEditor(current => current ? { ...current, product: { ...current.product, ...value } } : null);
  const mutate = async (path: string, method: string, input: Record<string, unknown>, closeEditor: boolean) => {
    if (savingRef.current) return;
    savingRef.current = true; setSaving(true); setError(''); setAuthError(false);
    notify({ phase: 'saving', title: method === 'DELETE' ? 'Eliminando producto' : 'Guardando producto', message: 'Estamos guardando el cambio. Espera un momento…' });
    try {
      const result = await adminRequest<MenuSnapshot>(path, { method, body: JSON.stringify(input) });
      setSnapshot(result); if (closeEditor) setEditor(null);
      setExpectedVersion(result.version); setPublication('waiting'); setConflict(false);
      setPublicationCheck(current => current + 1);
      setNotice('Cambios guardados en el repositorio. La web se actualizará cuando termine la publicación.');
      notify({ phase: 'waiting', title: method === 'DELETE' ? 'Producto eliminado · esperando publicación' : 'Producto guardado · esperando publicación', message: 'El cambio está en el repositorio. Comprobando cuándo aparece en la web…', version: result.version });
    } catch (exception) { reportError(exception); }
    finally { savingRef.current = false; setSaving(false); }
  };
  const save = (event: { preventDefault: () => void }) => {
    event.preventDefault();
    if (!editor || !snapshot || validError) return;
    void mutate(editor.isNew ? 'products' : `products/${editor.product.id}`, editor.isNew ? 'POST' : 'PUT', {
      revision: snapshot.revision, ...(editor.isNew ? { id: editor.product.id } : {}), product: editableProduct(editor.product),
    }, true);
  };
  const remove = useCallback((product: ProductData) => transition(() => { setEditor(null); setConfirmation({ title: `Eliminar «${product.name}»`, message: 'Se eliminará únicamente este producto del repositorio y se solicitará su publicación. Si solo quieres retirarlo temporalmente, cambia su estado a Oculto.', action: 'Eliminar', run: () => {
    // Read the current snapshot from the render that presents the confirmation.
    setPendingDelete(product.id);
  } }); }), [transition]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  useEffect(() => {
    if (!pendingDelete || !snapshot) return;
    const id = pendingDelete; setPendingDelete(null);
    void mutate(`products/${id}`, 'DELETE', { revision: snapshot.revision }, true);
  }, [pendingDelete]);
  const logout = () => transition(() => { dirtyRef.current = false; setSnapshot(null); setEditor(null); setSession(null); window.location.assign('/cdn-cgi/access/logout'); });
  const filtered = useMemo(() => products.filter(product => product.name.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es')) && (!category || product.category === category) && (!status || product.status === status)), [products, search, category, status]);
  const currentPage = Math.min(page, Math.max(0, Math.ceil(filtered.length / PAGE_SIZE) - 1));
  const pageItems = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  if (!session) return <div className="fusion-admin fusion-access"><span className="fusion-kicker">ACCESO PRIVADO</span><h1>La carta, <em>en tus manos.</em></h1><p>Administra los productos de Fusión x8 con tu correo autorizado.</p>
    {checking ? <p role="status">Comprobando acceso seguro…</p> : <><a className="fusion-login fusion-primary" href="/api/admin/login">Iniciar sesión</a><button type="button" onClick={() => void checkSession()}>Volver a comprobar</button></>}
    {error && <p role="alert" className="fusion-error">{error}</p>}<small>El código de acceso lo envía Cloudflare al correo autorizado. No hay registro público.</small></div>;

  return <div className="fusion-admin fusion-dashboard">
    <div className="fusion-session"><span>Acceso privado · {session.email}</span><button type="button" disabled={saving} onClick={logout}>Cerrar sesión</button></div>
    <div className="fusion-page-heading" hidden={!!editor}><div><span className="fusion-kicker">CARTA · FUSIÓN X8</span><h1>Tu carta, <em>al día.</em></h1><p>Precios, productos y lo que hay disponible hoy.</p></div><button type="button" className="fusion-primary fusion-create-action" disabled={saving || !snapshot} onClick={create}>Crear producto</button></div>
    <div className="fusion-status" role="status" aria-live="polite" data-phase={saving ? 'saving' : error ? 'error' : publication ? 'saved' : 'ready'}>
      {saving ? <><Spinner /> Guardando en el repositorio…</> : dirty ? <strong>Cambios sin guardar en el formulario.</strong> : notice || 'Carta cargada del repositorio.'}
      {publication && <p className="fusion-publication">{publication === 'waiting' && <Spinner />} Último guardado: {publication === 'live' ? 'disponible en la web; versión verificada.' : publication === 'waiting' ? 'esperando confirmar la publicación.' : 'aún no se pudo confirmar en la web. Pide al responsable técnico revisar la publicación.'}{publication === 'unconfirmed' && <button type="button" disabled={saving} onClick={() => { notify({ phase: 'waiting', title: 'Comprobando publicación', message: 'Consultando la versión de la carta pública…', version: expectedVersion! }); setPublicationCheck(current => current + 1); }}>Volver a comprobar publicación</button>}</p>}
    </div>
    {error && <div className="fusion-error" role="alert"><p>{error}</p>{authError && <a href="/api/admin/login" target="_blank" rel="noopener noreferrer">Reabrir acceso en otra pestaña</a>}</div>}
    <div className="fusion-filters" hidden={!!editor}>
      <label className="fusion-field" htmlFor="product-search">Buscar por nombre<input id="product-search" type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} /></label>
      <label className="fusion-field" htmlFor="category-filter">Filtrar categoría<select id="category-filter" value={category} onChange={event => { setCategory(event.target.value); setPage(0); }}><option value="">Todas</option>{categories.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label className="fusion-field" htmlFor="status-filter">Filtrar estado<select id="status-filter" value={status} onChange={event => { setStatus(event.target.value); setPage(0); }}><option value="">Todos</option>{statuses.map(item => <option key={item} value={item}>{statusLabels[item]}</option>)}</select></label>
      <button type="button" disabled={loading || saving} onClick={() => void load(true)}>{loading ? 'Cargando…' : 'Cargar versión actual'}</button>
    </div>
    <div className="fusion-workspace">
      <section className="fusion-catalog" hidden={!!editor} aria-label="Listado de productos"><div className="fusion-catalog-heading"><h2>Productos</h2><span role="status">{filtered.length} de {products.length} productos</span></div>
        {!snapshot ? <p className="fusion-empty" role="status">{loading ? "Cargando carta…" : "No se pudo cargar la carta. Usa Cargar versión actual para intentarlo de nuevo."}</p> : !filtered.length ? <div className="fusion-empty"><h3>{products.length ? 'No encontramos productos' : 'Tu carta empieza aquí'}</h3><p>{products.length ? 'Prueba otro nombre o cambia los filtros.' : 'Crea el primer producto para comenzar.'}</p></div> : <ul className="fusion-products">{pageItems.map(product => <ProductRow key={product.id} product={product} selected={editor?.product.id === product.id} image={product.image ? imageSources[product.image] : undefined} busy={saving || loading} edit={edit} remove={remove} />)}</ul>}
        {filtered.length > PAGE_SIZE && <nav className="fusion-pagination" aria-label="Páginas de productos"><span>{currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, filtered.length)} de {filtered.length}</span><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Anterior</button><button type="button" disabled={(currentPage + 1) * PAGE_SIZE >= filtered.length} onClick={() => setPage(currentPage + 1)}>Siguiente</button></nav>}
      </section>
      {editor && <ProductEditor key={editor.product.id} product={editor.product} isNew={editor.isNew} dirty={dirty} saving={saving} validation={validError} missing={!editor.isNew && !original} conflict={conflict} original={original} loading={loading} reload={() => void load()} image={editor.product.image ? imageSources[editor.product.image] : undefined} patch={patch} save={save} cancel={() => transition(() => setEditor(null))} />}
    </div>
    <ConfirmDialog confirmation={confirmation} close={() => setConfirmation(null)} />
    <AdminFeedback feedback={feedback} dismiss={dismissFeedback} />
  </div>;
}
