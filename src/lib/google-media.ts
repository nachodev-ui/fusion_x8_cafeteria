import media from '../data/google-media.json';
import { fetchFusionPlace, type PlacePhoto } from './google-reviews';

function matches(photo: PlacePhoto, id: string) {
  if (!photo.googleMapsURI) return false;
  try { return decodeURIComponent(photo.googleMapsURI).includes(`!1s${id}!`); } catch { return false; }
}
function loadImage(image: HTMLImageElement, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Photo unavailable'));
    image.src = src;
  });
}
export async function initGoogleMedia() {
  const hero = document.querySelector<HTMLElement>('[data-google-hero]');
  if (!hero?.dataset.apiKey || !hero.dataset.placeId) return;
  const gallery = document.querySelector<HTMLElement>('[data-google-gallery]');
  const template = document.querySelector<HTMLTemplateElement>('[data-google-photo-template]');
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const place = await Promise.race([
      fetchFusionPlace(hero.dataset.apiKey, hero.dataset.placeId),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Photos timeout')), 20000); }),
    ]);
    const photos = place.photos || [];
    const selected = media.photos.filter(item => `${item.publishedMonth}-01` >= media.minimumDate).map(item => ({ item, photo: photos.find(photo => matches(photo, item.id)) })).filter(entry => !!entry.photo);
    const main = selected.find(entry => entry.item.role === 'hero');
    if (main?.photo && hero.dataset.staticHero !== 'true') {
      const image = hero.querySelector<HTMLImageElement>('[data-hero-photo]')!;
      image.alt = main.item.alt;
      image.width = main.photo.widthPx;
      image.height = main.photo.heightPx;
      // Generate a fresh URL for this visit; do not store Google photo URLs or bytes.
      await loadImage(image, main.photo.getURI({}));
      image.hidden = false;
      hero.querySelector<HTMLElement>('.hero-local-fallback')!.hidden = true;
      hero.querySelector<HTMLElement>('[data-hero-eyebrow]')!.textContent = 'UN RINCÓN DE CIUDAD DEL SOL';
      hero.querySelector<HTMLElement>('[data-hero-caption]')!.textContent = 'Tu próximo buen momento.';
      const credit = hero.querySelector<HTMLAnchorElement>('[data-hero-source]')!;
      credit.href = main.photo.googleMapsURI || main.item.sourceUrl;
      hero.querySelector<HTMLElement>('[data-hero-date]')!.textContent = main.item.dateLabel;
      const authors = hero.querySelector<HTMLElement>('[data-hero-authors]')!;
      authors.replaceChildren();
      main.photo.authorAttributions.forEach((author, index) => {
        if (index) authors.append(document.createTextNode(', '));
        const link = document.createElement('a');
        link.textContent = author.displayName;
        link.href = author.uri?.startsWith('https://') ? author.uri : main.item.sourceUrl;
        link.target = '_blank'; link.rel = 'noopener noreferrer';
        authors.append(link);
      });
      if (!authors.textContent) authors.textContent = main.item.author;
      hero.dataset.mediaState = 'live';
    }
    if (gallery && template && selected.length) {
      const cards = await Promise.all(selected.map(async ({ item, photo }) => {
        // Import into the active document so detached images can load before insertion.
        const fragment = document.importNode(template.content, true);
        const card = fragment.querySelector<HTMLElement>('figure')!;
        const image = card.querySelector<HTMLImageElement>('img')!;
        image.alt = item.alt;
        image.width = photo!.widthPx;
        image.height = photo!.heightPx;
        await loadImage(image, photo!.getURI({ maxWidth: 900 }));
        card.querySelector<HTMLElement>('[data-photo-title]')!.textContent = item.title;
        card.querySelector<HTMLElement>('[data-photo-date]')!.textContent = item.dateLabel;
        card.querySelector<HTMLAnchorElement>('[data-photo-source]')!.href = photo!.googleMapsURI || item.sourceUrl;
        const authors = card.querySelector<HTMLElement>('[data-photo-authors]')!;
        photo!.authorAttributions.forEach((author, index) => {
          if (index) authors.append(document.createTextNode(', '));
          const link = document.createElement('a');
          link.textContent = author.displayName;
          link.href = author.uri?.startsWith('https://') ? author.uri : item.sourceUrl;
          link.target = '_blank'; link.rel = 'noopener noreferrer';
          authors.append(link);
        });
        if (!authors.textContent) authors.textContent = item.author;
        return card;
      }).map(promise => promise.catch(() => null)));
      const loaded = cards.filter((card): card is HTMLElement => !!card);
      if (loaded.length) {
        gallery.replaceChildren(...loaded);
        gallery.classList.add('gallery-grid-recent');
        gallery.dataset.mediaState = 'live';
      }
    }
  } catch { if (hero.dataset.staticHero !== 'true') hero.dataset.mediaState = 'fallback'; }
  finally { if (timer) clearTimeout(timer); }
}
