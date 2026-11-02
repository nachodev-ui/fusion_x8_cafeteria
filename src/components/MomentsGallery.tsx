import { useEffect, useMemo, useRef, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import { getMomentPhotos, subscribeMomentPhotos, type MomentPhoto } from '../lib/moment-photos';
import '../styles/moments.css';

export default function MomentsGallery({ fallback, children }: { fallback: MomentPhoto[]; children?: ReactNode }) {
  const live = useSyncExternalStore(subscribeMomentPhotos, getMomentPhotos, () => undefined);
  // Keep the local selection when Maps publishes its limited set of live photos.
  const photos = useMemo(() => live
    ? [...live, ...fallback.filter(photo => !live.some(current => current.id === photo.id))]
    : fallback, [live, fallback]);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !('IntersectionObserver' in window)) return;
    const stage = wrap.querySelector<HTMLElement>('.moments-stage')!;
    const track = wrap.querySelector<HTMLElement>('.moments-track')!;
    const media = window.matchMedia('(min-width: 900px) and (min-height: 620px) and (prefers-reduced-motion: no-preference)');
    let frame = 0;
    let visible = false;
    const update = () => {
      frame = 0;
      if (!media.matches) return;
      const rect = wrap.getBoundingClientRect();
      const travel = wrap.offsetHeight - stage.offsetHeight;
      const progress = Math.min(1, Math.max(0, (115 - rect.top) / Math.max(1, travel)));
      // Start only after the scene is pinned. Leave time to see both compositions.
      const opening = Math.min(1, Math.max(0, (progress - .22) / .66));
      const eased = opening * opening * (3 - 2 * opening);
      wrap.style.setProperty('--spread', String(eased));
      wrap.dataset.open = String(opening === 1);
    };
    const schedule = () => {
      if (visible && !frame) frame = requestAnimationFrame(update);
    };
    const configure = () => {
      wrap.dataset.animated = String(media.matches);
      wrap.style.removeProperty('--spread');
      const cardWidth = track.querySelector<HTMLElement>('.moment-card')?.offsetWidth ?? 0;
      const step = Math.max(0, (track.clientWidth - cardWidth - 48) / Math.max(1, photos.length - 1));
      wrap.style.setProperty('--fan-step', `${step}px`);
      update();
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) schedule();
    });
    observer.observe(wrap);
    configure();
    media.addEventListener('change', configure);
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', configure);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      media.removeEventListener('change', configure);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', configure);
      delete wrap.dataset.animated;
      delete wrap.dataset.open;
      wrap.style.removeProperty('--spread');
      wrap.style.removeProperty('--fan-step');
    };
  }, [photos.length]);

  return (
    <div className="moments-wrap" ref={wrapRef}>
      <div className="moments-stage">
        {children}
        <div className="moments-track" data-google-gallery data-media-state={live ? 'live' : 'fallback'}
          role="region" aria-label="Fotografías de Fusión X8" tabIndex={0}>
          {photos.map((photo, index) => (
            <figure className="moment-card" key={photo.id} style={{
              '--offset': index - (photos.length - 1) / 2,
              '--normalized': (index - (photos.length - 1) / 2) / Math.max(1, (photos.length - 1) / 2),
              '--edge': Math.abs(index - (photos.length - 1) / 2) / Math.max(1, (photos.length - 1) / 2),
              '--layer': photos.length - Math.floor(Math.abs(index - (photos.length - 1) / 2)),
            } as CSSProperties}>
              <a className="moment-image" href={photo.sourceUrl} target="_blank" rel="noopener noreferrer"
                aria-label={`Ver ${photo.title} en Google Maps, abre una pestaña nueva`}>
                <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} loading="lazy" decoding="async" draggable={false} />
                <span className="moment-number" aria-hidden="true">{String(index + 1).padStart(2, '0')} ↗</span>
              </a>
              <figcaption>
                <h3>{photo.title}</h3>
                <p>{photo.dateLabel} · <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">Google Maps</a></p>
                <small>Foto: {photo.authors.map((author, i) => <span key={`${author.url}-${i}`}>
                  {i > 0 && ', '}<a href={author.url} target="_blank" rel="noopener noreferrer">{author.name}</a>
                </span>)}{photo.edited && <span> · {photo.edited}</span>}</small>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </div>
  );
}
