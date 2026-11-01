/** Align QR entries and the home-page menu anchor after real layout, not a timer. */
export function initCartaEntry() {
  const target = document.querySelector<HTMLElement>('[data-carta-start]');
  if (!target) return;
  const isCartaRoute = /^\/carta(?:\/index\.html)?\/?$/.test(location.pathname);
  let active = false;
  let frame = 0;
  const headers = Array.from(document.querySelectorAll<HTMLElement>('[data-entry-header], .site-header'));
  function headerOffset() {
    return headers.reduce((offset, header) => {
      const position = getComputedStyle(header).position;
      const rect = header.getBoundingClientRect();
      return (position === 'fixed' || position === 'sticky') && rect.top <= 1 && rect.bottom > 0 ? Math.max(offset, rect.bottom) : offset;
    }, 0);
  }
  function align() {
    frame = 0;
    if (!active || !target) return;
    const offset = headerOffset();
    document.documentElement.style.setProperty('--carta-header-offset', `${offset}px`);
    const top = Math.max(0, target.getBoundingClientRect().top + window.scrollY - offset);
    // Override the home page's smooth scrolling: entry must land immediately.
    const previous = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo({ top, left: 0, behavior: 'auto' });
    document.documentElement.style.scrollBehavior = previous;
  }
  function schedule() {
    if (active && !frame) frame = requestAnimationFrame(align);
  }
  function enter() {
    active = true;
    // Prevent Safari/Chrome history restoration from overwriting the QR landing.
    if (isCartaRoute && 'scrollRestoration' in history) history.scrollRestoration = 'manual';
    schedule();
    requestAnimationFrame(schedule);
  }
  // Keep late fonts/images from shifting the initial landing on slow connections.
  // Once the visitor interacts, never pull them away from the product they chose.
  for (const event of ['touchstart', 'pointerdown', 'wheel', 'keydown'] as const) {
    window.addEventListener(event, () => { active = false; }, { passive: true, capture: true });
  }
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(schedule);
    for (const element of [...headers, ...document.querySelectorAll<HTMLElement>('[data-carta-layout], .hero')]) observer.observe(element, { box: 'border-box' });
  }
  window.addEventListener('resize', schedule, { passive: true });
  window.visualViewport?.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('load', schedule, { once: true });
  void document.fonts?.ready.then(schedule);
  window.addEventListener('pageshow', () => {
    if (isCartaRoute && (!location.hash || location.hash === '#carta')) enter();
  });
  window.addEventListener('hashchange', () => { if (location.hash === '#carta') enter(); });
  document.addEventListener('click', event => {
    const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null;
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || url.hash !== '#carta' || link.target === '_blank') return;
    event.preventDefault();
    if (location.hash !== '#carta') history.pushState(null, '', url);
    enter();
  });
  if ((isCartaRoute && !location.hash) || location.hash === '#carta') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', enter, { once: true });
    else enter();
  }
}
