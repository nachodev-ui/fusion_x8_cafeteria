import type { ImageMetadata } from 'astro';
import cookieCup from '../assets/products/cookie-cup.webp';
import waffleFrutillas from '../assets/products/waffle-frutillas.webp';
import galletones from '../assets/products/galletones-veganos.webp';
import cinnamonRoll from '../assets/products/cinnamon-roll.webp';
import kuchen from '../assets/products/kuchen-sureno.webp';
import data from './products.json';
import { parseMenu, type ProductData } from './menu-schema';
export { categories, menuGroups } from './menu-config';
export { formatPrice } from './menu-format';

const images: Record<string, ImageMetadata> = { 'cookie-cup': cookieCup, 'waffle-frutillas': waffleFrutillas, 'galletones-veganos': galletones, 'cinnamon-roll': cinnamonRoll, 'kuchen-sureno': kuchen };
export type Product = Omit<ProductData, 'image'> & { image?: ImageMetadata };
export const products: Product[] = parseMenu(data).products.map(({ image, ...product }) => ({ ...product, ...(image ? { image: images[image] } : {}) }));
export const menuInfo = { sourceNote: 'Carta vigente administrada por Fusión x8. Confirma disponibilidad al pedir.', pendingPriceNote: 'Precio por confirmar con el local.' };

export const menuReferences = [
  { label: 'Café', file: '/references/carta-cafe.png' },
  { label: 'Té y bebestibles', file: '/references/carta-te-bebestibles.png' },
  { label: 'Copas y barquillos', file: '/references/carta-helados.png' },
  { label: 'Sándwiches', file: '/references/carta-sandwiches.png' },
  { label: 'Pasteles y postres', file: '/references/carta-pasteles.png' },
];
