import { categories, menuGroups, type Category, type MenuGroup } from './menu-config';

export const statuses = ['disponible', 'agotado', 'oculto'] as const;
export type ProductStatus = typeof statuses[number];
export const dietaryTags = ['vegetariano', 'sin-gluten', 'picante'] as const;
export type DietaryTag = typeof dietaryTags[number];
export const dietaryTagLabels: Record<DietaryTag, string> = { vegetariano: 'Vegetariano', 'sin-gluten': 'Sin gluten', picante: 'Picante' };
export const imageKeys = ['cookie-cup', 'waffle-frutillas', 'galletones-veganos', 'cinnamon-roll', 'kuchen-sureno'] as const;
export interface ProductData {
  id: string;
  name: string;
  description: string;
  price: number | null;
  category: Category;
  group: MenuGroup;
  status: ProductStatus;
  note?: string;
  image?: string;
  tags?: DietaryTag[];
}
export interface MenuData { products: ProductData[] }

export function parseMenu(value: unknown): MenuData {
  const fail = (message: string): never => { throw new Error(message); };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail('La carta debe ser un objeto JSON.');
  if (Object.keys(value).some(key => key !== 'products')) return fail('La carta contiene campos desconocidos.');
  const items = (value as { products?: unknown }).products;
  if (!Array.isArray(items) || items.length > 2000) return fail('La carta debe contener una lista de hasta 2000 productos.');
  if (new TextEncoder().encode(JSON.stringify(value, null, 2)).byteLength > 750_000) return fail('La carta supera el límite de 750 KB. Pide al responsable técnico revisar su tamaño.');
  const ids = new Set<string>();
  for (const [index, item] of items.entries()) {
    const prefix = `Producto ${index + 1}: `;
    if (!item || typeof item !== 'object' || Array.isArray(item)) return fail(prefix + 'formato inválido.');
    if (Object.keys(item).some(key => !['id', 'name', 'description', 'price', 'category', 'group', 'status', 'note', 'image', 'tags'].includes(key))) return fail(prefix + 'campo desconocido.');
    if (typeof item.id !== 'string' || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(item.id) || ids.has(item.id)) return fail(prefix + 'identificador inválido o duplicado.');
    ids.add(item.id);
    if (typeof item.name !== 'string' || !item.name.trim() || item.name !== item.name.trim() || item.name.length > 120) return fail(prefix + 'el nombre es obligatorio, sin espacios en los extremos y de hasta 120 caracteres.');
    if (typeof item.description !== 'string' || item.description.length > 1000) return fail(prefix + 'la descripción admite hasta 1000 caracteres.');
    if (item.price !== null && (typeof item.price !== 'number' || !Number.isSafeInteger(item.price) || item.price < 0 || item.price > 1_000_000_000)) return fail(prefix + 'el precio debe ser un número entero entre 0 y 1.000.000.000 o quedar por confirmar.');
    if (!categories.some(category => category.id === item.category)) return fail(prefix + 'categoría inválida.');
    if (!menuGroups.some(group => group.id === item.group && group.category === item.category)) return fail(prefix + 'selecciona un grupo de la categoría elegida.');
    if (!statuses.includes(item.status)) return fail(prefix + 'estado inválido.');
    if (item.note !== undefined && (typeof item.note !== 'string' || item.note.length > 1000)) return fail(prefix + 'nota inválida.');
    if (item.image !== undefined && !imageKeys.includes(item.image)) return fail(prefix + 'referencia de imagen desconocida.');
    if (item.tags !== undefined && (!Array.isArray(item.tags) || item.tags.length > dietaryTags.length || new Set(item.tags).size !== item.tags.length || item.tags.some((tag: unknown) => !dietaryTags.includes(tag as DietaryTag)))) return fail(prefix + 'etiquetas inválidas.');
  }
  return value as MenuData;
}

export const isVisible = (product: Pick<ProductData, 'status'>) => product.status !== 'oculto';
export const canOrder = (product: Pick<ProductData, 'status'>) => product.status === 'disponible';

export function getVisibleMenu<T extends Pick<ProductData, 'status' | 'category' | 'group'>>(products: T[]) {
  const visible = products.filter(isVisible);
  return {
    products: visible,
    categories: categories.filter(category => visible.some(product => product.category === category.id)),
    groups: menuGroups.filter(group => visible.some(product => product.group === group.id)),
  };
}

// Stable canonical representation for comparing the repository with the deployed site.
export const menuSignatureInput = (menu: MenuData) => JSON.stringify(menu.products.map(product => ({
  id: product.id, name: product.name, description: product.description, price: product.price,
  category: product.category, group: product.group, status: product.status,
  note: product.note ?? null, image: product.image ?? null,
  tags: [...(product.tags ?? [])].sort(),
})));
