import { readFileSync } from 'node:fs';
import { parseMenu } from '../src/data/menu-schema';
const menu = parseMenu(JSON.parse(readFileSync(new URL('../src/data/products.json', import.meta.url), 'utf8')));
console.log(`Carta válida: ${menu.products.length} productos.`);
