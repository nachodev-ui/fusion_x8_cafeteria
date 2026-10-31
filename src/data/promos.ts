export const weekdays = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const;

export interface Promo {
  id: string;
  day: typeof weekdays[number];
  title: string;
  price: number;
  condition: string;
  // Horas locales de America/Santiago, en formato HH:mm.
  schedule?: { start: string; end: string };
}

export const promos: Promo[] = [
  { id: 'martes-waffle', day: 'martes', title: 'Waffle', price: 6500, condition: 'Solo consumo en local' },
  { id: 'miercoles-copa', day: 'miércoles', title: 'Copa de helado', price: 5600, condition: 'Solo consumo en local', schedule: { start: '15:30', end: '22:00' } },
];
