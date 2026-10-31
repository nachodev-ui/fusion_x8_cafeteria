import type { ImageMetadata } from 'astro';
import cookieCup from '../assets/products/cookie-cup.webp';
import waffleFrutillas from '../assets/products/waffle-frutillas.webp';
import galletones from '../assets/products/galletones-veganos.webp';
import cinnamonRoll from '../assets/products/cinnamon-roll.webp';
import kuchen from '../assets/products/kuchen-sureno.webp';

export type Category = 'cafeteria' | 'heladeria' | 'comida';
export type MenuGroup = 'cafe' | 'te' | 'bebestibles' | 'extras-cafe' | 'copas' | 'barquillos' | 'extras-helado' | 'sandwiches' | 'pasteles' | 'postres' | 'extras-comida';

export interface Product {
  id: string;
  category: Category;
  group: MenuGroup;
  name: string;
  description: string;
  // null = el precio está cortado en la imagen de origen. Nunca equivale a $0.
  price: number | null;
  note?: string;
  image?: ImageMetadata;
}

// Carta transcrita de las imágenes compartidas por el usuario.
// Todos los productos, ingredientes y precios están centralizados aquí.
// Valores enteros en CLP; no se completan dígitos que no aparecen en las fuentes.
export const menuInfo = {
  sourceNote: 'Valores de la carta compartida. Confirma precios y disponibilidad al pedir.',
  pendingPriceNote: 'Precio por confirmar: el valor no se ve completo en la carta compartida.',
};

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

export const products: Product[] = [
  // Café — IMG_0874.PNG
  { id: 'espresso', category: 'cafeteria', group: 'cafe', name: 'Espresso', description: '30 ml de café.', price: 1900 },
  { id: 'macchiato', category: 'cafeteria', group: 'cafe', name: 'Macchiato', description: '30 ml de café con crema de leche.', price: 2900 },
  { id: 'americano', category: 'cafeteria', group: 'cafe', name: 'Americano', description: '30 ml de café y agua.', price: 2700 },
  { id: 'cappuccino', category: 'cafeteria', group: 'cafe', name: 'Cappuccino', description: '30 ml de café, 30 ml de leche y 30 ml de crema de leche.', price: 3900 },
  { id: 'latte', category: 'cafeteria', group: 'cafe', name: 'Latte', description: '30 ml de café, 60 ml de leche y 10 ml de crema de leche.', price: 3900 },
  { id: 'ristretto', category: 'cafeteria', group: 'cafe', name: 'Ristretto', description: '22 ml de café concentrado.', price: 1600 },
  { id: 'affogato', category: 'cafeteria', group: 'cafe', name: 'Affogato', description: '30 ml de café con una porción de helado de vainilla.', price: 3900 },
  { id: 'mocaccino', category: 'cafeteria', group: 'cafe', name: 'Mocaccino', description: '30 ml de café, 50 ml de leche, 10 ml de crema de leche y syrup de chocolate.', price: 4200 },
  { id: 'cafe-helado', category: 'cafeteria', group: 'cafe', name: 'Café helado', description: 'Helado de vainilla, 30 ml de café, 200 ml de leche y crema chantilly.', price: 5900 },
  { id: 'milkshake', category: 'cafeteria', group: 'cafe', name: 'Milkshake', description: 'Helado a elección, 200 ml de leche y crema chantilly.', price: 5900 },
  { id: 'chocolate-caliente', category: 'cafeteria', group: 'cafe', name: 'Chocolate caliente', description: '125 ml de leche con cacao Lucaffé.', price: null },
  { id: 'frappuccino', category: 'cafeteria', group: 'cafe', name: 'Frappuccino', description: 'Hielo frappé, 30 ml de café, syrup a elección y crema chantilly.', price: null },
  { id: 'cortado', category: 'cafeteria', group: 'cafe', name: 'Cortado', description: '30 ml de café y 30 ml de crema de leche.', price: null },
  { id: 'cookie-cup', category: 'cafeteria', group: 'extras-cafe', name: 'Cookie Cup', description: 'Vaso de galleta con baño de chocolate. Pídelo como extra para tu café o chocolate.', price: 1500, image: cookieCup },
  { id: 'syrup', category: 'cafeteria', group: 'extras-cafe', name: 'Agregado de syrup', description: 'Amaretto, vainilla, chocolate, caramelo o crema irlandesa.', price: 800 },

  // Té y bebestibles — IMG_0870.PNG
  { id: 'te', category: 'cafeteria', group: 'te', name: 'Té', description: 'Una pausa calientita para acompañar tu tarde.', price: 2400 },
  { id: 'te-jamaica', category: 'cafeteria', group: 'te', name: 'Té flor de Jamaica', description: 'Té de flor de Jamaica.', price: 2700 },
  { id: 'te-chai', category: 'cafeteria', group: 'te', name: 'Té chai', description: 'Tu momento de té con chai.', price: 3000 },
  { id: 'te-chai-latte', category: 'cafeteria', group: 'te', name: 'Té chai latte', description: 'Té chai, leche y crema de leche.', price: 3900 },
  { id: 'te-con-leche', category: 'cafeteria', group: 'te', name: 'Té con leche', description: 'Té acompañado de leche.', price: 2800 },
  { id: 'leche-caliente', category: 'cafeteria', group: 'te', name: 'Leche caliente', description: 'Una taza de leche caliente.', price: 2200 },
  { id: 'platano-leche', category: 'cafeteria', group: 'te', name: 'Plátano con leche', description: 'La combinación de plátano y leche de siempre.', price: 4100 },
  { id: 'infusiones', category: 'cafeteria', group: 'te', name: 'Infusiones', description: 'Consulta las variedades disponibles al pedir.', price: 2500 },
  { id: 'bebidas', category: 'cafeteria', group: 'bebestibles', name: 'Bebidas', description: 'Consulta las opciones disponibles.', price: 2600 },
  { id: 'agua-mineral', category: 'cafeteria', group: 'bebestibles', name: 'Agua mineral', description: 'Para refrescar tu pausa.', price: 2200 },
  { id: 'jugos', category: 'cafeteria', group: 'bebestibles', name: 'Jugos', description: 'Piña, frambuesa, frutilla, melón, mango o frutos rojos.', price: 3900 },
  { id: 'limonadas', category: 'cafeteria', group: 'bebestibles', name: 'Limonadas', description: 'Clásica, menta, menta jengibre, jengibre o coco.', price: 3900 },

  // Heladería — IMG_0873.PNG
  { id: 'copa-fusion', category: 'heladeria', group: 'copas', name: 'Copa Fusión', description: 'Mix de frutos rojos, helado de frutos del bosque, crema chantilly y salsa de frambuesa.', price: 6600 },
  { id: 'copa-black', category: 'heladeria', group: 'copas', name: 'Copa Black', description: 'Brownie, helado de chocolate, crema chantilly y salsa de chocolate.', price: 6600 },
  { id: 'copa-frutal', category: 'heladeria', group: 'copas', name: 'Copa Frutal', description: 'Mix de fruta, dos sabores de helado a elección, crema chantilly y salsa de caramelo.', price: 6600 },
  { id: 'copa-nino', category: 'heladeria', group: 'copas', name: 'Copa Niño', description: 'Dos sabores de helado, crema chantilly, toppings a elección y salsa de manjar.', price: 5500 },
  { id: 'barquillo-simple', category: 'heladeria', group: 'barquillos', name: 'Barquillo simple', description: 'Consulta los sabores disponibles para tu barquillo.', price: null },
  { id: 'barquillo-doble', category: 'heladeria', group: 'barquillos', name: 'Barquillo doble', description: 'Consulta los sabores disponibles para tu barquillo.', price: null },
  { id: 'barquillo-triple', category: 'heladeria', group: 'barquillos', name: 'Barquillo triple', description: 'Consulta los sabores disponibles para tu barquillo.', price: null },
  { id: 'porcion-crema', category: 'heladeria', group: 'extras-helado', name: 'Porción de crema', description: 'Agrega una porción de crema a tu helado.', price: 800 },
  { id: 'bano-chocolate', category: 'heladeria', group: 'extras-helado', name: 'Baño de chocolate', description: 'Un toque de chocolate para tu helado.', price: 800 },
  { id: 'toppings', category: 'heladeria', group: 'extras-helado', name: 'Toppings', description: 'Consulta los toppings disponibles.', price: 700 },

  // Sándwiches — IMG_0872.PNG
  { id: 'mechada-fusion', category: 'comida', group: 'sandwiches', name: 'Mechada Fusión', description: 'Mechada, queso fundido, champiñones, rúcula y baby berro.', price: 7800 },
  { id: 'mechada-palta', category: 'comida', group: 'sandwiches', name: 'Mechada palta', description: 'Mechada, palta y tomate cherry.', price: 7800 },
  { id: 'mechada-chacarera', category: 'comida', group: 'sandwiches', name: 'Mechada chacarera', description: 'Mechada, poroto verde, tomate cherry y ají verde.', price: 7500 },
  { id: 'mechada-luco', category: 'comida', group: 'sandwiches', name: 'Mechada Luco', description: 'Mechada con queso fundido.', price: 7500 },
  { id: 'mechada-americana', category: 'comida', group: 'sandwiches', name: 'Mechada americana', description: 'Mechada, pepinillo dulce, tocino y queso cheddar.', price: 7800 },
  { id: 'ave-palta', category: 'comida', group: 'sandwiches', name: 'Ave palta', description: 'Ave, palta y mayonesa.', price: 7500 },
  { id: 'queso-cabra', category: 'comida', group: 'sandwiches', name: 'Queso cabra', description: 'Queso de cabra, tomate cherry, albahaca y aceite de oliva.', price: 7500 },
  { id: 'vegetariano', category: 'comida', group: 'sandwiches', name: 'Vegetariano', description: 'Queso fresco, lechuga hidropónica, rúcula y tomate cherry.', price: 7200 },
  { id: 'jamon-serrano', category: 'comida', group: 'sandwiches', name: 'Jamón serrano', description: 'Jamón serrano, queso crema, albahaca, tomate cherry, orégano y aceite de oliva.', price: 7500 },
  { id: 'extra-sandwich', category: 'comida', group: 'extras-comida', name: 'Agregados extras', description: 'Consulta qué puedes agregar a tu sándwich.', price: null },

  // Pasteles y postres — IMG_0871.PNG
  { id: 'trozo-torta', category: 'comida', group: 'pasteles', name: 'Trozo de torta', description: 'Consulta las tortas disponibles para tu porción.', price: 4300 },
  { id: 'pie-limon', category: 'comida', group: 'pasteles', name: 'Pie de limón', description: 'Un gustito de limón para acompañar tu café.', price: 4100 },
  { id: 'kuchen-manzana', category: 'comida', group: 'pasteles', name: 'Kuchen manzana', description: 'Una porción de kuchen de manzana.', price: 3000 },
  { id: 'kuchen-sureno', category: 'comida', group: 'pasteles', name: 'Kuchen sureño', description: 'Una porción de kuchen sureño.', price: 4100, image: kuchen },
  // TODO: Confirmar precio real de los galletones veganos; $2.500 es un precio de ejemplo.
  { id: 'galletones-veganos', category: 'comida', group: 'pasteles', name: 'Galletones veganos', description: 'Galletones de limón, chocolate brownie, canela o matcha.', price: 2500, note: 'Precio de ejemplo, por confirmar.', image: galletones },
  // TODO: Confirmar precio real del cinnamon roll; $3.900 es un precio de ejemplo.
  { id: 'cinnamon-roll', category: 'comida', group: 'pasteles', name: 'Cinnamon roll', description: 'Un suave rollo de canela para acompañar tu café.', price: 3900, note: 'Precio de ejemplo, por confirmar.', image: cinnamonRoll },
  { id: 'kuchen-nuez', category: 'comida', group: 'pasteles', name: 'Kuchen nuez', description: 'Una porción de kuchen de nuez.', price: 4100 },
  { id: 'cheesecake', category: 'comida', group: 'pasteles', name: 'Cheesecake', description: 'Consulta la variedad disponible.', price: 4300 },
  { id: 'donuts', category: 'comida', group: 'pasteles', name: 'Donuts', description: 'Algo dulce para acompañar tu pausa.', price: 2500 },
  { id: 'muffin', category: 'comida', group: 'pasteles', name: 'Muffin', description: 'Consulta las variedades disponibles.', price: 2700 },
  { id: 'medialuna', category: 'comida', group: 'pasteles', name: 'Medialuna', description: 'Una medialuna para acompañar tu cafecito.', price: 1100 },
  { id: 'relleno-por-confirmar', category: 'comida', group: 'pasteles', name: 'Dulce relleno · nombre por confirmar', description: 'Producto relleno de la sección de pasteles.', price: 1800, note: 'El nombre aparece cortado en la carta compartida; consulta la variedad.' },
  { id: 'waffle', category: 'comida', group: 'postres', name: 'Waffle', description: 'Base de Nutella o manjar, plátano y/o frutilla, helado a elección, crema chantilly y salsa.', price: 7300, image: waffleFrutillas },
  { id: 'fondue-fusion', category: 'comida', group: 'postres', name: 'Fondue Fusión', description: 'Para dos: chocolate italiano dulce o belga semiamargo, frutilla, plátano, trozos de waffle y marshmallow.', price: null },
  { id: 'volcan-chocolate', category: 'comida', group: 'postres', name: 'Volcán de chocolate', description: 'Pastel tibio de chocolate 70% cacao con helado de vainilla.', price: null },
  { id: 'banana-split', category: 'comida', group: 'postres', name: 'Banana split', description: 'Tres porciones de helado y crema chantilly.', price: 6500 },
];

export const menuReferences = [
  { label: 'Café', file: '/references/carta-cafe.png' },
  { label: 'Té y bebestibles', file: '/references/carta-te-bebestibles.png' },
  { label: 'Copas y barquillos', file: '/references/carta-helados.png' },
  { label: 'Sándwiches', file: '/references/carta-sandwiches.png' },
  { label: 'Pasteles y postres', file: '/references/carta-pasteles.png' },
];

const clp = new Intl.NumberFormat('es-CL', {
  style: 'currency', currency: 'CLP', maximumFractionDigits: 0,
});

export const formatPrice = (price: number | null) => price === null ? 'Por confirmar' : clp.format(price);
