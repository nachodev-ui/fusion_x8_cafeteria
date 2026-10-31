import { createHash } from 'node:crypto';
import data from '../data/products.json';
import { parseMenu, menuSignatureInput } from '../data/menu-schema';
export function GET() {
  const version = createHash('sha256').update(menuSignatureInput(parseMenu(data))).digest('hex');
  return new Response(JSON.stringify({ version }), { headers: { 'Content-Type': 'application/json' } });
}
