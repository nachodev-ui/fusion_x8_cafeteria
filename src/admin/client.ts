import type { MenuData, ProductData } from '../data/menu-schema';
export interface MenuSnapshot { menu: MenuData; revision: string; version: string }
export interface AdminSession { email: string; expiresAt: number; logoutUrl: string }
export class AdminApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/admin/${path}`, { ...options, credentials: 'same-origin', redirect: 'error',
      signal: AbortSignal.timeout(35_000), headers: { 'X-Requested-With': 'XMLHttpRequest', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers }, cache: 'no-store' });
  } catch {
    throw new AdminApiError(0, 'NETWORK_ERROR', options.body ? 'No se recibió la respuesta. Conservamos tu formulario. Comprueba la carta actual antes de repetir el guardado.' : 'No se pudo comprobar el acceso. Intenta de nuevo o inicia sesión.');
  }
  if (!response.headers.get('Content-Type')?.includes('application/json')) throw new AdminApiError(401, 'UNAUTHENTICATED', 'Vuelve a iniciar sesión para continuar.');
  const value = await response.json().catch(() => null);
  if (!response.ok) throw new AdminApiError(response.status, value?.code || 'REQUEST_ERROR', value?.message || 'No se pudo completar la operación.');
  if (!value) throw new AdminApiError(502, 'INVALID_RESPONSE', 'No se pudo interpretar la respuesta. Comprueba el estado de la carta antes de reintentar.');
  return value as T;
}
export const editableProduct = (product: ProductData) => ({ name: product.name.trim(), description: product.description, price: product.price, category: product.category, group: product.group, status: product.status, tags: product.tags ?? [] });
