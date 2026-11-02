let cancelActive: (() => void) | undefined;

/** A deliberately paced return, independent of native browser scroll duration. */
export function scrollToTopSmoothly(top: number, finished: (completed: boolean) => void) {
  cancelActive?.();
  const start = window.scrollY;
  const distance = Math.max(0, top) - start;
  const duration = Math.min(2200, Math.max(1200, 800 + Math.abs(distance) * .35));
  const root = document.documentElement;
  const previousBehavior = root.style.scrollBehavior;
  // Do not nest native smooth scrolls inside our animation frames.
  root.style.scrollBehavior = 'auto';
  let frame = 0;
  let ended = false;
  const events = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
  function finish(completed: boolean) {
    if (ended) return;
    ended = true;
    cancelAnimationFrame(frame);
    for (const event of events) window.removeEventListener(event, cancel, true);
    window.removeEventListener('pagehide', cancel);
    root.style.scrollBehavior = previousBehavior;
    cancelActive = undefined;
    finished(completed);
  }
  function cancel() { finish(false); }
  cancelActive = cancel;
  if (Math.abs(distance) < 1 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
    finish(true);
    return;
  }
  for (const event of events) window.addEventListener(event, cancel, { passive: true, capture: true });
  window.addEventListener('pagehide', cancel, { once: true });
  const started = performance.now();
  function step(now: number) {
    const progress = Math.max(0, Math.min(1, (now - started) / duration));
    // Sine easing starts and finishes at zero speed, without a sharp mid-point.
    const eased = (1 - Math.cos(Math.PI * progress)) / 2;
    window.scrollTo({ top: start + distance * eased, behavior: 'auto' });
    if (progress < 1) frame = requestAnimationFrame(step);
    else finish(true);
  }
  frame = requestAnimationFrame(step);
}
