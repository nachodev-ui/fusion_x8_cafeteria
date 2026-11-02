import media from '../data/google-media.json';
import { fetchFusionPlace, type PlacePhoto } from './google-reviews';
import { publishMomentPhotos, type MomentPhoto } from './moment-photos';

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
    if (selected.length) {
      const cards = await Promise.all(selected.map(async ({ item, photo }): Promise<MomentPhoto> => {
        const src = photo!.getURI({ maxWidth: 900 });
        // Preload before publishing; React alone owns the gallery DOM.
        await loadImage(new Image(), src);
        return {
          id: item.id, src, alt: item.alt, width: photo!.widthPx, height: photo!.heightPx,
          title: item.title, dateLabel: item.dateLabel, sourceUrl: photo!.googleMapsURI || item.sourceUrl,
          authors: photo!.authorAttributions.length ? photo!.authorAttributions.map(author => ({
            name: author.displayName,
            url: author.uri?.startsWith('https://') ? author.uri : item.sourceUrl,
          })) : [{ name: item.author, url: item.sourceUrl }],
        };
      }).map(promise => promise.catch(() => null)));
      const loaded = cards.filter((card): card is MomentPhoto => !!card);
      if (loaded.length) publishMomentPhotos(loaded);
    }
  } catch { if (hero.dataset.staticHero !== 'true') hero.dataset.mediaState = 'fallback'; }
  finally { if (timer) clearTimeout(timer); }
}
