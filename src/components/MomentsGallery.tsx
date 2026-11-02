import { useEffect, useMemo, useRef, useSyncExternalStore, type CSSProperties } from 'react';
import { getMomentPhotos, subscribeMomentPhotos, type MomentPhoto } from '../lib/moment-photos';
import '../styles/moments.css';

export default function MomentsGallery({ fallback }: { fallback: MomentPhoto[] }) {
  const live = useSyncExternalStore(subscribeMomentPhotos, getMomentPhotos, () => undefined);
  // Keep the local selection when Maps publishes its limited set of live photos.
  const photos = useMemo(() => live
    ? [...live, ...fallback.filter(photo => !live.some(current => current.id === photo.id))]
    : fallback, [live, fallback]);
  const columns = Math.min(4, photos.length > 4 ? Math.ceil(photos.length / 2) : photos.length);
  const multirow = photos.length > 4;
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const media = window.matchMedia('(min-width: 900px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)');
    let frame = 0;
    let visible = false;
    const update = () => {
      frame = 0;
      if (!media.matches) return;
      const rect = wrap.getBoundingClientRect();
      const travel = multirow ? window.innerHeight * .45 : wrap.offsetHeight - wrap.querySelector<HTMLElement>('.moments-stage')!.offsetHeight;
      const start = multirow ? window.innerHeight - 100 : 115;
      const progress = Math.min(1, Math.max(0, (start - rect.top) / Math.max(1, travel)));
      const eased = 1 - Math.pow(1 - progress, 3);
      wrap.style.setProperty('--spread', String(eased));
    };
    const schedule = () => {
      if (visible && !frame) frame = requestAnimationFrame(update);
    };
    const configure = () => {
      wrap.dataset.animated = String(media.matches);
      wrap.style.removeProperty('--spread');
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
      wrap.style.removeProperty('--spread');
    };
  }, [multirow]);

  return (
    <div className="moments-wrap" data-multirow={multirow} style={{ '--columns': columns } as CSSProperties} ref={wrapRef}>
      <div className="moments-stage">
        <div className="moments-track" data-google-gallery data-media-state={live ? 'live' : 'fallback'}
          role="region" aria-label="Fotografías de Fusión X8" tabIndex={0}>
          {photos.map((photo, index) => (
            <figure className="moment-card" key={photo.id} style={{
              '--offset': index % columns - (columns - 1) / 2,
              '--stack-x': `${((columns - 1) / 2 - index % columns) * 100}%`,
              '--stack-gap': `${((columns - 1) / 2 - index % columns) * 24}px`,
              zIndex: photos.length - index,
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
