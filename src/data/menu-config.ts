export type Category = 'cafeteria' | 'heladeria' | 'comida';
export type MenuGroup = 'cafe' | 'te' | 'bebestibles' | 'extras-cafe' | 'copas' | 'barquillos' | 'extras-helado' | 'sandwiches' | 'pasteles' | 'postres' | 'extras-comida';

export const categories: { id: Category; label: string; note: string; icon: string }[] = [
  { id: 'cafeteria', label: 'Cafetería', note: 'Café, té y algo fresquito para acompañar tu pausa.', icon: 'coffee' },
  { id: 'heladeria', label: 'Heladería', note: 'Copas, barquillos y tus agregados favoritos.', icon: 'icecream' },
  { id: 'comida', label: 'Para comer', note: 'Sándwiches en ciabatta de masa madre, pasteles y postres.', icon: 'food' },
];

export const menuGroups: { id: MenuGroup; category: Category; label: string; description?: string }[] = [
  { id: 'cafe', category: 'cafeteria', label: 'Café' },
  { id: 'te', category: 'cafeteria', label: 'Té, infusiones y leche' },
  { id: 'bebestibles', category: 'cafeteria', label: 'Bebestibles' },
  { id: 'extras-cafe', category: 'cafeteria', label: 'Dale un toque extra', description: 'Para acompañar tus cafés o chocolates.' },
  { id: 'copas', category: 'heladeria', label: 'Copas de helado' },
  { id: 'barquillos', category: 'heladeria', label: 'Barquillos' },
  { id: 'extras-helado', category: 'heladeria', label: 'Agregados para tu helado' },
  { id: 'sandwiches', category: 'comida', label: 'Sándwiches', description: 'Todos en pan ciabatta de masa madre.' },
  { id: 'extras-comida', category: 'comida', label: 'Agregados para tu sándwich' },
  { id: 'pasteles', category: 'comida', label: 'Pasteles y algo dulce' },
  { id: 'postres', category: 'comida', label: 'Postres para regalonearse' },
];
