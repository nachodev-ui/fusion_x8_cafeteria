import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve } from 'node:path';
import { parseMenu } from '../src/data/menu-schema';
import data from '../src/data/products.json';

const root = resolve('dist');
const html = readFileSync(resolve(root, 'carta/index.html'), 'utf8');
const visible = parseMenu(data).products.filter(product => product.status !== 'oculto');
assert.equal([...html.matchAll(/data-product-id=/g)].length, visible.length);
assert.doesNotMatch(html, /astro-island|<iframe|fonts\.googleapis|fonts\.gstatic|<script[^>]+src="https?:/);
const assets = new Set<string>();
for (const match of html.matchAll(/(?:href|src)="(\/[^"?#]+\.(?:css|js|png|webp))"/g)) assets.add(match[1]);
for (const asset of [...assets].filter(path => path.endsWith('.css'))) {
  const css = readFileSync(resolve(root, '.' + asset), 'utf8');
  for (const match of css.matchAll(/url\(["']?(\/[^)'"\s]+\.woff2)["']?\)/g)) assets.add(match[1]);
}
// Include shared JS chunks imported by the page entry, not just <script src>.
for (const asset of assets) {
  if (!asset.endsWith('.js')) continue;
  const script = readFileSync(resolve(root, '.' + asset), 'utf8');
  for (const match of script.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)["']([./][^"']+\.js)["']/g)) assets.add(new URL(match[1], `https://build.local${asset}`).pathname);
}
const resources = [...assets].map(path => {
  const bytes = readFileSync(resolve(root, '.' + path));
  return { path, transferBytes: /\.(css|js)$/.test(path) ? gzipSync(bytes).length : bytes.length };
});
assert.equal(resources.filter(asset => asset.path.endsWith('.woff2')).length, 3, 'tres fuentes locales, sin peticiones a Google');
const total = gzipSync(html).length + resources.reduce((sum, asset) => sum + asset.transferBytes, 0);
assert.ok(total < 120_000, `La carga inicial supera el presupuesto de 120 KB: ${total}`);
const report = { page: '/carta', products: visible.length, compressedHtmlBytes: gzipSync(html).length, estimatedInitialTransferBytes: total, budgetBytes: 120_000, resources, note: 'Presupuesto de bytes; no acredita latencia real ni el objetivo de 2 segundos en teléfonos. Sin comprobaciones visuales.' };
writeFileSync('output/pdf/carta/build-check.json', JSON.stringify(report, null, 2) + '\n');
console.log(`Carta compilada: ${visible.length} productos, ${(total / 1000).toFixed(1)} KB estimados de transferencia inicial; fuentes locales, sin React ni APIs externas.`);
