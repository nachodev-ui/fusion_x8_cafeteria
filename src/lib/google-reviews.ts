// Request only visible fields. Live results stay in memory for this visit.
interface Review {
  authorAttribution?: { displayName?: string; uri?: string; photoURI?: string };
  rating?: number;
  text?: string;
  relativePublishTimeDescription?: string;
  googleMapsURI?: string;
}
export interface PlacePhoto {
  authorAttributions: { displayName: string; uri?: string }[];
  googleMapsURI?: string;
  widthPx: number;
  heightPx: number;
  getURI(options: { maxWidth?: number; maxHeight?: number }): string;
}
export interface Place {
  rating?: number | null;
  userRatingCount?: number | null;
  reviews?: Review[];
  photos?: PlacePhoto[];
  attributions?: { provider?: string; providerURI?: string }[];
  fetchFields(options: { fields: string[] }): Promise<unknown>;
}
interface PlacesLibrary { Place: new (options: { id: string; requestedLanguage: string; requestedRegion: string }) => Place; }
type MapsWindow = Window & { google?: { maps: { importLibrary(name: 'places'): Promise<PlacesLibrary> } }; __fusionMapsReady?: () => void };
let libraryPromise: Promise<PlacesLibrary> | undefined;
const placeRequests = new Map<string, Promise<Place>>();

const safeUrl = (value?: string | null): string | undefined => {
  if (!value) return;
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : undefined; } catch { return; }
};

export function loadPlaces(apiKey: string): Promise<PlacesLibrary> {
  if (libraryPromise) return libraryPromise;
  const mapsWindow = window as MapsWindow;
  if (mapsWindow.google?.maps.importLibrary) {
    libraryPromise = mapsWindow.google.maps.importLibrary('places');
    return libraryPromise;
  }
  libraryPromise = new Promise<PlacesLibrary>((resolve, reject) => {
    const script = document.createElement('script');
    mapsWindow.__fusionMapsReady = () => {
      delete mapsWindow.__fusionMapsReady;
      if (!mapsWindow.google?.maps.importLibrary) { reject(new Error('Maps unavailable')); return; }
      mapsWindow.google.maps.importLibrary('places').then(resolve, reject);
    };
    const params = new URLSearchParams({ key: apiKey, callback: '__fusionMapsReady', loading: 'async', v: 'weekly', language: 'es', region: 'CL' });
    script.src = `https://maps.googleapis.com/maps/api/js?${params}`;
    script.async = true;
    script.dataset.googlePlacesSdk = '';
    script.addEventListener('error', () => reject(new Error('Maps unavailable')), { once: true });
    document.head.append(script);
  });
  return libraryPromise;
}

export function fetchFusionPlace(apiKey: string, id: string): Promise<Place> {
  let request = placeRequests.get(id);
  if (!request) {
    request = (async () => {
      const { Place } = await loadPlaces(apiKey);
      const place = new Place({ id, requestedLanguage: 'es', requestedRegion: 'cl' });
      await place.fetchFields({ fields: ['rating', 'userRatingCount', 'reviews', 'attributions', 'photos'] });
      return place;
    })();
    placeRequests.set(id, request);
  }
  return request;
}

function renderReview(review: Review, template: HTMLTemplateElement, mapsUrl: string, index: number): HTMLElement {
  const fragment = template.content.cloneNode(true) as DocumentFragment;
  const card = fragment.querySelector<HTMLElement>('article')!;
  const author = review.authorAttribution?.displayName?.trim() || 'Usuario de Google';
  const authorLink = card.querySelector<HTMLAnchorElement>('[data-review-author]')!;
  authorLink.textContent = author;
  authorLink.href = safeUrl(review.authorAttribution?.uri) || mapsUrl;
  card.querySelector<HTMLElement>('[data-review-initials]')!.textContent = author.split(/\s+/).slice(0, 2).map((part) => part[0]).join('');
  card.querySelector<HTMLElement>('[data-review-date]')!.textContent = review.relativePublishTimeDescription || 'Reseña en Google Maps';
  const avatar = card.querySelector<HTMLImageElement>('[data-review-avatar]')!;
  const photoUrl = safeUrl(review.authorAttribution?.photoURI);
  if (photoUrl) {
    avatar.addEventListener('error', () => { avatar.hidden = true; }, { once: true });
    avatar.src = photoUrl;
    avatar.hidden = false;
  }
  const stars = card.querySelector<HTMLElement>('[data-review-stars]')!;
  if (typeof review.rating === 'number' && review.rating >= 1 && review.rating <= 5) {
    stars.textContent = '★'.repeat(Math.round(review.rating));
    const empty = document.createElement('span');
    empty.style.color = '#78614c';
    empty.setAttribute('aria-hidden', 'true');
    empty.textContent = '☆'.repeat(5 - Math.round(review.rating));
    stars.append(empty);
    stars.setAttribute('aria-label', `${review.rating} de 5 estrellas`);
  } else { stars.hidden = true; }
  const text = card.querySelector<HTMLElement>('[data-review-text]')!;
  text.id = `google-review-text-${index}`;
  text.textContent = review.text?.trim() || 'Esta persona dejó una calificación sin comentario.';
  const expand = card.querySelector<HTMLButtonElement>('[data-review-expand]')!;
  if (text.textContent.length > 220) {
    text.classList.add('is-truncated');
    expand.hidden = false;
    expand.setAttribute('aria-controls', text.id);
    expand.addEventListener('click', () => {
      const expanded = expand.getAttribute('aria-expanded') !== 'true';
      expand.setAttribute('aria-expanded', String(expanded));
      expand.textContent = expanded ? 'Leer menos' : 'Leer más';
      text.classList.toggle('is-truncated', !expanded);
    });
  }
  card.querySelector<HTMLAnchorElement>('[data-review-link]')!.href = safeUrl(review.googleMapsURI) || mapsUrl;
  return card;
}

export function initGoogleReviews(section: HTMLElement) {
  const key = section.dataset.apiKey;
  const id = section.dataset.placeId;
  const status = section.querySelector<HTMLElement>('[data-google-status]');
  const template = section.querySelector<HTMLTemplateElement>('[data-review-template]');
  const list = section.querySelector<HTMLElement>('[data-reviews-list]');
  const source = section.querySelector<HTMLAnchorElement>('.google-attribution');
  if (!key || !id || !status || !template || !list || !source) return;
  const fallbackStatus = status.textContent || '';

  async function update() {
    if (section.dataset.reviewState !== 'fallback') return;
    section.dataset.reviewState = 'loading';
    status!.textContent = 'Consultando opiniones en Google Maps…';
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const place = await Promise.race([
        fetchFusionPlace(key!, id!),
        new Promise<never>((_, reject) => { timeout = setTimeout(() => reject(new Error('Maps timeout')), 20000); }),
      ]);
      if (typeof place.rating !== 'number' || place.rating < 1 || place.rating > 5 || typeof place.userRatingCount !== 'number') throw new Error('Incomplete rating');
      section.querySelector<HTMLElement>('[data-place-rating]')!.textContent = place.rating.toLocaleString('es-CL', { maximumFractionDigits: 1 });
      section.querySelector<HTMLElement>('[data-place-count]')!.textContent = place.userRatingCount.toLocaleString('es-CL');
      const overallStars = section.querySelector<HTMLElement>('[data-place-stars]')!;
      overallStars.style.setProperty('--star-fill', `${place.rating / 5 * 100}%`);
      overallStars.setAttribute('aria-label', `${place.rating.toLocaleString('es-CL')} de 5 estrellas`);

      // Preserve Google's relevance order without filtering by star rating.
      const reviews = place.reviews || [];
      const note = section.querySelector<HTMLElement>('[data-review-note]')!;
      const more = section.querySelector<HTMLButtonElement>('[data-more-reviews]')!;
      if (reviews.length) {
        // Cloning the template also preserves Astro's scoped style attributes.
        const cards = reviews.map((review, index) => renderReview(review, template!, source!.href, index));
        cards.forEach((card, index) => { card.hidden = index >= 3; });
        list!.replaceChildren(...cards);
        note.textContent = 'Selección de reseñas proporcionada por Google Maps. Consulta todas las opiniones en la ficha del local.';
        if (cards.length > 3) {
          more.hidden = false;
          more.addEventListener('click', () => { cards.forEach((card) => { card.hidden = false; }); more.hidden = true; }, { once: true });
        }
      }
      const providers = section.querySelector<HTMLElement>('[data-review-providers]')!;
      for (const attribution of place.attributions || []) {
        if (!attribution.provider) continue;
        const url = safeUrl(attribution.providerURI);
        const item = document.createElement(url ? 'a' : 'span');
        item.textContent = attribution.provider;
        if (url && item instanceof HTMLAnchorElement) { item.href = url; item.target = '_blank'; item.rel = 'noopener noreferrer'; }
        providers.append(item, document.createTextNode(' '));
      }
      providers.hidden = !providers.childNodes.length;
      section.dataset.reviewState = 'live';
      status!.textContent = 'Calificación actualizada desde Google Maps.';
    } catch (error) {
      section.dataset.reviewState = 'error';
      status!.textContent = `${fallbackStatus} Consulta las novedades en Google Maps.`;
      const message = error instanceof Error ? error.message : 'Solicitud no disponible';
      // Useful for setup diagnostics without printing an API key or request URL.
      console.warn('Fusión X8: no se pudieron actualizar las reseñas.', message.replace(/AIza[\w-]+/g, '[clave oculta]').replace(/https?:\/\/\S+/g, '[URL omitida]'));
    } finally { if (timeout) clearTimeout(timeout); }
  }

  // One request as this section approaches the viewport; no polling or storage.
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      void update();
    }, { rootMargin: '150px' });
    observer.observe(section);
  } else { void update(); }
}
