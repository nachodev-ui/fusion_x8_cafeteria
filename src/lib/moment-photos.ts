export interface MomentPhoto {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  title: string;
  dateLabel: string;
  sourceUrl: string;
  authors: { name: string; url: string }[];
  edited?: string;
}

// Shared with the existing Maps loader. Keep live URLs in memory for this visit only.
let photos: MomentPhoto[] | undefined;
const listeners = new Set<() => void>();

export const getMomentPhotos = () => photos;
export function subscribeMomentPhotos(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function publishMomentPhotos(next: MomentPhoto[]) {
  photos = next;
  listeners.forEach(listener => listener());
}
