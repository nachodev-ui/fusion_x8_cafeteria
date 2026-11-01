import { scrollToCartaStart } from './carta-entry';

export const normalizeMenuSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim().replace(/\s+/g, ' ');

/** Static HTML remains complete without JS; this only changes the current view. */
export function initMenuBrowser(root: HTMLElement) {
  const categories = Array.from(root.querySelectorAll<HTMLAnchorElement>('[data-menu-category]'));
  const panels = Array.from(root.querySelectorAll<HTMLElement>('[data-menu-panel]'));
  const groupSections = Array.from(root.querySelectorAll<HTMLElement>('[data-menu-group-section]'));
  const groupNavs = Array.from(root.querySelectorAll<HTMLElement>('[data-group-category]'));
  const input = root.querySelector<HTMLInputElement>('[data-menu-search]');
  const clear = root.querySelector<HTMLButtonElement>('[data-menu-clear]');
  const status = root.querySelector<HTMLElement>('[data-menu-status]');
  const empty = root.querySelector<HTMLElement>('[data-menu-empty]');
  if (!categories.length || !panels.length || !input) return;
  const entries = Array.from(root.querySelectorAll<HTMLElement>('[data-menu-product]')).map(element => ({
    element, category: element.closest<HTMLElement>('[data-menu-panel]')!.dataset.menuPanel!,
    group: element.closest<HTMLElement>('[data-menu-group-section]')!.dataset.menuGroupSection!,
    search: normalizeMenuSearch(element.dataset.menuProduct ?? ''),
  }));
  let category = categories[0].dataset.menuCategory!;
  const selectedGroups = new Map<string, string>();
  for (const nav of groupNavs) selectedGroups.set(nav.dataset.groupCategory!, nav.querySelector<HTMLElement>('[data-menu-group]')?.dataset.menuGroup ?? 'all');
  function render() {
    const query = normalizeMenuSearch(input!.value);
    const terms = query.split(' ').filter(Boolean);
    const group = selectedGroups.get(category) ?? 'all';
    let count = 0;
    const shownGroups = new Set<string>(), shownCategories = new Set<string>();
    for (const entry of entries) {
      const visible = query ? terms.every(term => entry.search.includes(term)) : entry.category === category && (group === 'all' || entry.group === group);
      entry.element.hidden = !visible;
      if (visible) { count++; shownGroups.add(entry.group); shownCategories.add(entry.category); }
    }
    for (const panel of panels) panel.hidden = !shownCategories.has(panel.dataset.menuPanel!);
    for (const section of groupSections) section.hidden = !shownGroups.has(section.dataset.menuGroupSection!);
    for (const link of categories) {
      if (!query && link.dataset.menuCategory === category) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
    for (const nav of groupNavs) {
      nav.hidden = !!query || nav.dataset.groupCategory !== category;
      for (const button of nav.querySelectorAll<HTMLButtonElement>('[data-menu-group]')) button.setAttribute('aria-pressed', String(button.dataset.menuGroup === group));
    }
    if (clear) clear.hidden = !input!.value;
    if (empty) empty.hidden = count !== 0;
    if (status) {
      status.textContent = query ? `${count} ${count === 1 ? 'resultado' : 'resultados'} en toda la carta` : `${count} ${count === 1 ? 'opción disponible para consultar' : 'opciones para consultar'}`;
      status.classList.toggle('menu-sr-only', !query);
    }
    root.classList.toggle('menu-is-searching', !!query);
  }
  function syncHash() {
    const id = location.hash.slice(1).replace(/^panel-/, '');
    const link = categories.find(link => link.dataset.menuCategory === id);
    if (link) { category = link.dataset.menuCategory!; return true; }
    const section = groupSections.find(section => section.dataset.menuGroupSection === id || section.id === id);
    if (section) {
      category = section.closest<HTMLElement>('[data-menu-panel]')!.dataset.menuPanel!;
      selectedGroups.set(category, section.dataset.menuGroupSection!);
      return true;
    }
    return false;
  }
  function updateHash(id: string) {
    history.replaceState(null, '', `${location.pathname}${location.search}#${id}`);
    requestAnimationFrame(() => scrollToCartaStart());
  }
  categories.forEach((link, index) => {
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      category = link.dataset.menuCategory!;
      input.value = '';
      render();
      updateHash(category);
    });
    link.addEventListener('keydown', event => {
      const next = event.key === 'ArrowRight' ? (index + 1) % categories.length : event.key === 'ArrowLeft' ? (index + categories.length - 1) % categories.length : event.key === 'Home' ? 0 : event.key === 'End' ? categories.length - 1 : -1;
      if (next < 0) return;
      event.preventDefault();
      categories[next].focus();
      categories[next].click();
    });
  });
  for (const nav of groupNavs) nav.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('[data-menu-group]') : null;
    if (!button) return;
    selectedGroups.set(category, button.dataset.menuGroup!);
    render();
    updateHash(button.dataset.menuGroup === 'all' ? category : button.dataset.menuGroup!);
  });
  input.addEventListener('input', () => { render(); requestAnimationFrame(() => scrollToCartaStart()); });
  function reset() { input!.value = ''; render(); input!.focus({ preventScroll: true }); requestAnimationFrame(() => scrollToCartaStart()); }
  clear?.addEventListener('click', reset);
  root.querySelector('[data-menu-reset]')?.addEventListener('click', reset);
  window.addEventListener('hashchange', () => { if (syncHash()) { render(); requestAnimationFrame(() => scrollToCartaStart()); } });
  root.querySelector<HTMLElement>('[data-menu-search-control]')!.hidden = false;
  root.dataset.menuEnhanced = 'true';
  const linkedSelection = syncHash();
  render();
  if (linkedSelection) requestAnimationFrame(() => scrollToCartaStart());
  const controls = root.querySelector<HTMLElement>('[data-menu-controls]');
  if (controls) {
    const measure = () => root.style.setProperty('--menu-controls-height', `${controls.getBoundingClientRect().height}px`);
    measure();
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(controls, { box: 'border-box' });
  }
}
