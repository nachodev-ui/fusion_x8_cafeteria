import croissants from '../assets/moments/croissants-andrea-octubre-2026.jpg';
import dessert from '../assets/moments/postre-bastian-octubre-2026.jpg';
import americano from '../assets/moments/americano-carlos-enero-2026.jpg';
import coffee from '../assets/moments/cafe-rayen-agosto-2026.jpg';

// Public gallery photographs, checked in Google Maps on 2 November 2026.
// Dates refer to the contributor's “Foto” label, not the review date.
const source = (id: string) => `https://www.google.com/maps/place//data=!3m4!1e2!3m2!1s${id}!2e10!4m2!3m1!1s0x9662d7e38864993f:0xdba53a6fe4cf1115`;

export const momentAdditions = [
  {
    id: 'CIABIhAC-wcJ7XS8xk43gvOajtI_', image: croissants,
    title: 'Un antojo recién servido',
    alt: 'Dos croissants con salsa de chocolate en un plato, frente al mural de Fusión X8',
    dateLabel: 'Octubre de 2026',
    authors: [{ name: 'Andrea Martin Letelier', url: 'https://maps.google.com/maps/contrib/110617890101408941043' }],
  },
  {
    id: 'CIABIhBmLOoXrca-flGBT8xiA3QE', image: americano,
    title: 'Un cafecito para la pausa',
    alt: 'Café americano servido en Fusión X8, fotografiado por Carlos Toledo',
    dateLabel: 'Enero de 2026',
    authors: [{ name: 'Carlos Toledo', url: 'https://maps.google.com/maps/contrib/116781383718522641068' }],
  },
  {
    id: 'CIABIhB71wCK8lsApBsID9ZoAsU9', image: dessert,
    title: 'Dulces momentos',
    alt: 'Postre en vaso con crema, servido en un plato frente al mural de Fusión X8',
    dateLabel: 'Octubre de 2026',
    authors: [{ name: 'bastian guiñez', url: 'https://maps.google.com/maps/contrib/113080937356526982581' }],
  },
  {
    id: 'CIABIhBfLk-N7c8F0xZ1qChf8Nff', image: coffee,
    title: 'La tarde tiene su color',
    alt: 'Taza de café con espuma sobre un plato, bajo la iluminación violeta de Fusión X8',
    dateLabel: 'Agosto de 2026',
    authors: [{ name: 'Rayen Valenzuela', url: 'https://maps.google.com/maps/contrib/112510959564149143260' }],
  },
].map(photo => ({ ...photo, sourceUrl: source(photo.id) }));
