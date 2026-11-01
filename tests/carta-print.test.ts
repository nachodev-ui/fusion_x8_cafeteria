import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import jsQR from 'jsqr';
import { PDFDocument, PDFDict, PDFName } from 'pdf-lib';
import { cartaUrl, createCode, qrSvg, quietZone, moduleRuns, standaloneQr, cardPdf, cardLayout, mm, parseArgs } from '../scripts/generate-carta-print';
import { parseMenu, menuSignatureInput } from '../src/data/menu-schema';
import sample from '../docs/examples/carta-ejemplo.json';
import config from '../config/carta-print.json';

// Decode the written SVG vector runs without a browser, screenshot or visual inspection.
function decodeSvg(svg: string) {
  const size = Number(svg.match(/viewBox="0 0 (\d+) \d+"/)?.[1]);
  const scale = 6, width = size * scale;
  const pixels = new Uint8ClampedArray(width * width * 4).fill(255);
  for (const match of svg.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) {
    const [, x, y, length] = match.map(Number);
    for (let row = y * scale; row < (y + 1) * scale; row++) for (let col = x * scale; col < (x + length) * scale; col++) {
      const position = (row * width + col) * 4;
      pixels[position] = pixels[position + 1] = pixels[position + 2] = 0;
    }
  }
  return jsQR(pixels, width, width)?.data;
}
test('los SVG se decodifican a la URL pública exacta, general y por mesa, con silencio >= 4 y corrección H', () => {
  assert.equal(config.errorCorrectionLevel, 'H');
  assert.ok(quietZone >= 4);
  for (const table of [undefined, 1, 12, 200]) {
    const url = cartaUrl(table), code = createCode(url), svg = qrSvg(code, url);
    assert.equal(decodeSvg(svg), table ? `${config.url}?mesa=${table}` : config.url);
    assert.doesNotMatch(svg, /<image|base64|http[s]?:\/\/(?!www.w3.org|fusion-x8)/);
    for (const run of moduleRuns(code)) {
      assert.ok(run.x >= quietZone && run.y >= quietZone);
      assert.ok(run.x + run.width <= code.modules.size + quietZone);
      assert.ok(run.y + 1 <= code.modules.size + quietZone);
    }
  }
});
test('la URL y la matriz impresa no dependen de precios ni productos', () => {
  const before = qrSvg(createCode(cartaUrl(1)), cartaUrl(1));
  const edited = structuredClone(sample);
  edited.products[0].price += 500;
  assert.notEqual(menuSignatureInput(parseMenu(sample)), menuSignatureInput(parseMenu(edited)));
  assert.equal(qrSvg(createCode(cartaUrl(1)), cartaUrl(1)), before);
  for (const base of ['http://cafe.cl/carta', 'https://cafe.cl/otra', 'https://cafe.cl/carta?x=1', 'https://u:p@cafe.cl/carta']) assert.throws(() => cartaUrl(undefined, base));
  for (const table of [0, -1, 1.5, 10000, NaN]) assert.throws(() => cartaUrl(table));
});
test('QR de 58 mm y dos diseños tienen corte, sangrado, panel seguro y fuentes incrustadas en ambos formatos', async () => {
  const url = cartaUrl(1), code = createCode(url);
  const qr = await PDFDocument.load(await standaloneQr(code, url));
  assert.equal(qr.getPageCount(), 1);
  assert.ok(Math.abs(qr.getPage(0).getWidth() - mm(58)) < .001);
  assert.equal(qr.getPage(0).node.Resources()?.lookup(PDFName.of('XObject'), PDFDict).keys().length ?? 0, 0);
  for (const [format, width, height] of [['10x15', 100, 150], ['a6', 105, 148]] as const) {
   for (const design of ['a', 'b'] as const) {
    const pdf = await PDFDocument.load(await cardPdf(code, url, format, 1, design));
    const page = pdf.getPage(0), trim = page.getTrimBox(), bleed = page.getBleedBox();
    assert.equal(pdf.getPageCount(), 1);
    assert.ok(Math.abs(trim.width - mm(width)) < .001 && Math.abs(trim.height - mm(height)) < .001);
    assert.ok(Math.abs(trim.x - bleed.x - mm(3)) < .001);
    assert.ok(Math.abs(bleed.width - trim.width - mm(6)) < .001);
    assert.ok(bleed.x > 0 && bleed.y > 0 && page.getWidth() > bleed.x + bleed.width);
    const fonts = page.node.Resources()?.lookup(PDFName.of('Font'), PDFDict);
    assert.equal(new Set(fonts?.values().map(reference => reference.toString())).size, 3);
    const images = page.node.Resources()?.lookup(PDFName.of('XObject'), PDFDict);
    assert.equal(images?.keys().length, 1, 'solo el logo es raster, el QR es vectorial');
    const { qr: bounds, panel } = cardLayout(format);
    assert.ok(bounds.size / width >= .55 && bounds.size / width <= .6);
    assert.equal(bounds.x - panel.x, 4);
    assert.equal(bounds.y - panel.y, 4);
    assert.ok(bounds.x >= 8 && bounds.y >= 8 && bounds.x + bounds.size <= width - 8);
   }
  }
});
test('nueve ejemplos válidos distribuidos en tres categorías y etiquetas validadas', () => {
  const menu = parseMenu(sample);
  for (const category of ['cafeteria', 'heladeria', 'comida']) assert.equal(menu.products.filter(product => product.category === category).length, 3);
  for (const tags of [['otro'], ['picante', 'picante'], 'vegetariano', [null], {}]) assert.throws(() => parseMenu({ products: [{ ...sample.products[0], tags }] }));
  assert.notEqual(menuSignatureInput(menu), menuSignatureInput({ products: menu.products.map(product => ({ ...product, tags: [] })) }));
});
test('generación por cantidad es explícita y la caché cubre las tres variantes', () => {
  assert.equal(parseArgs([]).tables, config.tables);
  assert.equal(parseArgs(['--mesas', '24']).tables, 24);
  assert.equal(parseArgs(['--diseno', 'b']).design, 'b');
  assert.equal(parseArgs(['--mesas', '0', '--formato', 'a6']).format, 'a6');
  for (const args of [['--mesas', '1.5'], ['--mesas', '-2'], ['--mesas', '201'], ['--formato', 'otro'], ['--url', 'http://localhost']]) assert.throws(() => parseArgs(args));
  const headers = readFileSync(new URL('../public/_headers', import.meta.url), 'utf8');
  for (const path of ['/carta', '/carta/', '/carta/index.html']) assert.ok(headers.includes(`${path}\n  Cache-Control: public, max-age=0, must-revalidate`));
  for (const file of ['carta', 'mesa-1']) {
    const svg = readFileSync(new URL(`../output/pdf/carta/qr/${file}.svg`, import.meta.url), 'utf8');
    assert.equal(decodeSvg(svg), cartaUrl(file === 'carta' ? undefined : 1));
  }
});
