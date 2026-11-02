import { useEffect, useRef, useState, type PointerEvent } from 'react';
import type { MomentPhoto } from '../lib/moment-photos';

export default function MomentViewer({ photos, initialIndex, returnFocus, onClose }: {
  photos: MomentPhoto[];
  initialIndex: number;
  returnFocus: HTMLElement;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const [index, setIndex] = useState(initialIndex);
  const photo = photos[index];
  const move = (direction: number) => setIndex(current => (current + direction + photos.length) % photos.length);

  useEffect(() => {
    const dialog = dialogRef.current!;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (returnFocus.isConnected) returnFocus.focus({ preventScroll: true });
    };
  }, [returnFocus]);

  function finishSwipe(event: PointerEvent<HTMLDivElement>) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const x = event.clientX - start.x;
    const y = event.clientY - start.y;
    if (Math.abs(x) > 60 && Math.abs(x) > Math.abs(y) * 1.25) move(x < 0 ? 1 : -1);
  }

  return (
    <dialog ref={dialogRef} className="moment-viewer" aria-labelledby="moment-viewer-title" aria-describedby="moment-viewer-position"
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose();
      }}
      onKeyDown={event => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          move(event.key === 'ArrowRight' ? 1 : -1);
        }
      }}>
      <div className="moment-viewer-header">
        <p className="eyebrow">MOMENTOS · FUSIÓN X8</p>
        <button type="button" className="moment-viewer-close" onClick={onClose} aria-label="Cerrar visor de fotos" autoFocus>×</button>
      </div>
      <figure>
        <div className="moment-viewer-photo"
          onPointerDown={event => {
            if (event.pointerType === 'touch' && event.isPrimary) {
              touchStart.current = { x: event.clientX, y: event.clientY };
              event.currentTarget.setPointerCapture(event.pointerId);
            }
          }}
          onPointerUp={finishSwipe} onPointerCancel={() => { touchStart.current = null; }}>
          <img src={photo.src} alt={photo.alt} width={photo.width} height={photo.height} decoding="async" draggable={false} />
        </div>
        <figcaption>
          <div className="moment-viewer-navigation">
            <button type="button" onClick={() => move(-1)} disabled={photos.length < 2} aria-label="Foto anterior">← <span>Anterior</span></button>
            <p id="moment-viewer-position" aria-live="polite" aria-atomic="true">{index + 1} de {photos.length}</p>
            <button type="button" onClick={() => move(1)} disabled={photos.length < 2} aria-label="Foto siguiente"><span>Siguiente</span> →</button>
          </div>
          <div className="moment-viewer-credit" aria-live="polite" aria-atomic="true">
            <h2 id="moment-viewer-title">{photo.title}</h2>
            <p>{photo.dateLabel} · <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">Ver en Google Maps ↗</a></p>
            <small>Foto: {photo.authors.map((author, i) => <span key={`${author.url}-${i}`}>
              {i > 0 && ', '}<a href={author.url} target="_blank" rel="noopener noreferrer">{author.name}</a>
            </span>)}{photo.edited && <span> · {photo.edited}</span>}</small>
          </div>
        </figcaption>
      </figure>
    </dialog>
  );
}
