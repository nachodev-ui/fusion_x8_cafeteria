import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import QRCode from 'qrcode';
import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, PrintScaling, rgb, degrees, pushGraphicsState, popGraphicsState, rectangle, clip, endPath, type PDFPage, type PDFFont, type Color } from 'pdf-lib';
import config from '../config/carta-print.json';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
export const mm = (value: number) => value * 72 / 25.4;
export const quietZone = config.quietZoneModules;
export const correction = config.errorCorrectionLevel as 'Q' | 'H';
export type CardFormat = '10x15' | 'a6';
export type CardDesign = 'a' | 'b';
export const designNames: Record<CardDesign, string> = { a: 'Rojo envolvente', b: 'Sello crema' };
export const formats: Record<CardFormat, { width: number; height: number }> = {
  '10x15': { width: 100, height: 150 }, a6: { width: 105, height: 148 },
};
export function cartaUrl(table?: number, base = config.url) {
  const url = new URL(base);
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.pathname !== '/carta' || url.search || url.hash || url.hostname === 'localhost' || !url.hostname.includes('.')) throw new Error('Configura una URL HTTPS pública y permanente terminada exactamente en /carta.');
  if (table !== undefined) {
    if (!Number.isSafeInteger(table) || table < 1 || table > 9999) throw new Error('Mesa inválida (1 a 9999).');
    url.searchParams.set('mesa', String(table));
  }
  return url.href;
}
export function createCode(url: string) {
  if (!['Q', 'H'].includes(correction) || !Number.isInteger(quietZone) || quietZone < 4 || quietZone > 16) throw new Error('El QR necesita corrección Q/H y zona de silencio de 4 a 16 módulos.');
  return QRCode.create(url, { errorCorrectionLevel: correction });
}
type Code = ReturnType<typeof createCode>;
// Merge horizontal modules. Both SVG and PDF use these exact vector runs.
export function moduleRuns(code: Code) {
  const runs: { x: number; y: number; width: number }[] = [];
  for (let y = 0; y < code.modules.size; y++) {
    let x = 0;
    while (x < code.modules.size) {
      if (!code.modules.get(y, x)) { x++; continue; }
      const start = x;
      while (x < code.modules.size && code.modules.get(y, x)) x++;
      runs.push({ x: start + quietZone, y: y + quietZone, width: x - start });
    }
  }
  return runs;
}
export function qrSvg(code: Code, url: string) {
  const size = code.modules.size + quietZone * 2;
  const title = url.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${config.qrSizeMm}mm" height="${config.qrSizeMm}mm" viewBox="0 0 ${size} ${size}" role="img" aria-labelledby="title" shape-rendering="crispEdges"><title id="title">${title}</title><path fill="#fff" d="M0 0h${size}v${size}H0z"/><path fill="#000" d="${moduleRuns(code).map(run => `M${run.x} ${run.y}h${run.width}v1h-${run.width}z`).join('')}"/></svg>\n`;
}
function drawCode(page: PDFPage, code: Code, x: number, y: number, size: number) {
  const total = code.modules.size + quietZone * 2;
  const unit = size / total;
  page.drawRectangle({ x, y, width: size, height: size, color: rgb(1, 1, 1) });
  for (const run of moduleRuns(code)) page.drawRectangle({ x: x + run.x * unit, y: y + size - (run.y + 1) * unit, width: run.width * unit, height: unit, color: rgb(0, 0, 0) });
}
export async function standaloneQr(code: Code, url: string) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`QR Fusión x8 - ${url}`);
  pdf.catalog.getOrCreateViewerPreferences().setPrintScaling(PrintScaling.None);
  drawCode(pdf.addPage([mm(config.qrSizeMm), mm(config.qrSizeMm)]), code, 0, 0, mm(config.qrSizeMm));
  return pdf.save();
}
// The source logo's opaque corner pixels are exactly #000000. Match, don't recolor.
const palette = { black: rgb(0, 0, 0), cream: rgb(245 / 255, 238 / 255, 228 / 255), red: rgb(214 / 255, 40 / 255, 40 / 255), white: rgb(1, 1, 1) };
function centered(page: PDFPage, text: string, font: PDFFont, size: number, baseline: number, maxWidth: number, color = palette.cream) {
  const actualSize = Math.min(size, size * maxWidth / font.widthOfTextAtSize(text, size));
  if (actualSize < 8) throw new Error(`Texto demasiado largo para imprimir legible: ${text}`);
  page.drawText(text, { x: (page.getWidth() - font.widthOfTextAtSize(text, actualSize)) / 2, y: baseline, font, size: actualSize, color });
}
function roundedPanel(page: PDFPage, x: number, y: number, width: number, height: number, radius: number, color: Color) {
  page.drawRectangle({ x: x + radius, y, width: width - radius * 2, height, color });
  page.drawRectangle({ x, y: y + radius, width, height: height - radius * 2, color });
  for (const cx of [x + radius, x + width - radius]) for (const cy of [y + radius, y + height - radius]) page.drawCircle({ x: cx, y: cy, size: radius, color });
}
export function cardLayout(format: CardFormat) {
  const { width, height } = formats[format];
  const size = config.qrSizeMm;
  if (!Number.isFinite(size) || size / width < .55 || size / width > .6) throw new Error('El QR debe ocupar entre el 55 y el 60 % del ancho al corte.');
  const panelSize = size + 8;
  const panel = { x: (width - panelSize) / 2, y: height - 61 - panelSize, size: panelSize };
  return { ...formats[format], panel, qr: { x: panel.x + 4, y: panel.y + 4, size } };
}
function cameraHint(page: PDFPage, font: PDFFont, center: number, baseline: number, color: Color) {
  const text = 'Apunta la cámara de tu celular', size = 11.2;
  const textWidth = font.widthOfTextAtSize(text, size), totalWidth = textWidth + mm(7);
  const left = center - totalWidth / 2;
  page.drawRectangle({ x: left, y: baseline - mm(.2), width: mm(4.8), height: mm(3.3), borderColor: color, borderWidth: .65 });
  page.drawCircle({ x: left + mm(2.4), y: baseline + mm(1.4), size: mm(.9), borderColor: color, borderWidth: .65 });
  page.drawLine({ start: { x: left + mm(1), y: baseline + mm(3.6) }, end: { x: left + mm(2.7), y: baseline + mm(3.6) }, color, thickness: .9 });
  page.drawText(text, { x: left + mm(7), y: baseline, font, size, color });
}
function coffeeDetail(page: PDFPage, x: number, y: number, color: Color) {
  // Preblended colors avoid transparency-state differences between PDF printers.
  const ink = color === palette.cream ? rgb(.14, .14, .14) : rgb(.80, .77, .73);
  page.drawEllipse({ x, y, xScale: mm(2.5), yScale: mm(4.6), rotate: degrees(-28), borderWidth: .8, borderColor: ink });
  page.drawSvgPath('M0 0 C-3 2 3 5 0 7', { x: x - mm(.8), y: y + mm(3.2), scale: mm(1), borderWidth: .25, borderColor: ink });
}
export async function cardPdf(code: Code, url: string, format: CardFormat, table?: number, design: CardDesign = 'a') {
  const { width, height } = formats[format];
  const bleed = config.bleedMm;
  if (!Number.isFinite(bleed) || bleed < 3 || bleed > 5) throw new Error('El sangrado debe ser de 3 a 5 mm.');
  const offset = bleed + 5; // 5 mm outside bleed for crop marks.
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.catalog.getOrCreateViewerPreferences().setPrintScaling(PrintScaling.None);
  pdf.setTitle(`Fusión x8 - ${designNames[design]} - ${table ? `Mesa ${table}` : 'Carta general'}`);
  pdf.setSubject(`${url} | corte ${width}x${height} mm | sangrado ${bleed} mm`);
  const [regular, bold, script, logo] = await Promise.all([
    pdf.embedFont(await readFile(require.resolve('@fontsource/dm-sans/files/dm-sans-latin-400-normal.woff')), { subset: true }),
    pdf.embedFont(await readFile(require.resolve('@fontsource/dm-sans/files/dm-sans-latin-700-normal.woff')), { subset: true }),
    pdf.embedFont(await readFile(require.resolve('@fontsource/dancing-script/files/dancing-script-latin-600-normal.woff')), { subset: true }),
    pdf.embedPng(await readFile(join(root, 'public/images/fusion-x8-logo.png'))),
  ]);
  const page = pdf.addPage([mm(width + offset * 2), mm(height + offset * 2)]);
  const x = mm(offset), y = mm(offset), w = mm(width), h = mm(height);
  page.setTrimBox(x, y, w, h);
  page.setBleedBox(x - mm(bleed), y - mm(bleed), w + mm(bleed * 2), h + mm(bleed * 2));
  page.pushOperators(pushGraphicsState(), rectangle(x - mm(bleed), y - mm(bleed), w + mm(bleed * 2), h + mm(bleed * 2)), clip(), endPath());
  page.drawRectangle({ x: x - mm(bleed), y: y - mm(bleed), width: w + mm(bleed * 2), height: h + mm(bleed * 2), color: palette.black });
  const layout = cardLayout(format);
  const X = (value: number) => x + mm(value), Y = (value: number) => y + mm(value);
  if (design === 'a') {
    page.drawEllipse({ x: X(width + 20), y: Y(height - 55), xScale: mm(45), yScale: mm(63), color: palette.red });
    page.drawEllipse({ x: X(width + 21), y: Y(height - 55), xScale: mm(37), yScale: mm(54), color: palette.black });
    coffeeDetail(page, X(11), Y(height - 42), palette.cream);
    coffeeDetail(page, X(9), Y(47), palette.cream);
    coffeeDetail(page, X(width - 10), Y(19), palette.cream);
  } else {
    // Cream lower field and a substantial red capsule give B a distinct silhouette.
    roundedPanel(page, X(-bleed), Y(-bleed - 22), mm(width + bleed * 2), mm(height - 57 + bleed + 22), mm(22), palette.cream);
    roundedPanel(page, X(8), Y(height - 60), mm(width - 16), mm(18), mm(9), palette.red);
    coffeeDetail(page, X(9), Y(42), palette.black);
    coffeeDetail(page, X(width - 9), Y(48), palette.black);
  }
  const logoSize = logo.scaleToFit(mm(24), mm(24));
  page.drawImage(logo, { x: (page.getWidth() - logoSize.width) / 2, y: Y(height - 33), ...logoSize });
  const safeWidth = w - mm(16);
  centered(page, 'Escanea para ver', bold, 15.5, Y(height - (design === 'a' ? 42 : 40)), safeWidth);
  centered(page, 'nuestra carta', script, 32, Y(height - 54), safeWidth);
  const panel = layout.panel;
  roundedPanel(page, X(panel.x), Y(panel.y), mm(panel.size), mm(panel.size), mm(5), design === 'a' ? palette.cream : palette.white);
  // The 58 mm square includes all four quiet modules. Nothing rounds or clips it.
  drawCode(page, code, X(layout.qr.x), Y(layout.qr.y), mm(layout.qr.size));
  cameraHint(page, regular, page.getWidth() / 2, Y(height - 133.5), design === 'a' ? palette.cream : palette.black);
  centered(page, 'Cafetería & Heladería', regular, 10.5, Y(8.9), safeWidth, design === 'a' ? palette.cream : palette.black);
  const tagText = table ? `Mesa ${table}` : 'Carta';
  const tagX = design === 'a' ? 8 : width - 26;
  roundedPanel(page, X(tagX), Y(height - 15), mm(18), mm(5), mm(2.5), rgb(.13, .13, .13));
  page.drawText(tagText, { x: X(tagX + 9) - regular.widthOfTextAtSize(tagText, 8.5) / 2, y: Y(height - 13.6), size: 8.5, font: regular, color: palette.cream });
  page.pushOperators(popGraphicsState());
  const mark = (x1: number, y1: number, x2: number, y2: number) => page.drawLine({ start: { x: mm(x1), y: mm(y1) }, end: { x: mm(x2), y: mm(y2) }, thickness: .4, color: rgb(0, 0, 0) });
  for (const cy of [offset, offset + height]) {
    mark(1, cy, 4, cy); mark(width + offset * 2 - 4, cy, width + offset * 2 - 1, cy);
  }
  for (const cx of [offset, offset + width]) {
    mark(cx, 1, cx, 4); mark(cx, height + offset * 2 - 4, cx, height + offset * 2 - 1);
  }
  return pdf.save();
}
export function parseArgs(args: string[]) {
  let tables = config.tables, format = config.format as CardFormat, out = join(root, 'output/pdf/carta');
  let design: CardDesign | undefined;
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index], value = args[index + 1];
    if (!value) throw new Error(`Falta valor para ${flag}.`);
    if (flag === '--mesas' && /^(0|[1-9]\d*)$/.test(value)) tables = Number(value);
    else if (flag === '--formato' && Object.hasOwn(formats, value)) format = value as CardFormat;
    else if (flag === '--out') out = resolve(value);
    else if (flag === '--diseno' && Object.hasOwn(designNames, value)) design = value as CardDesign;
    else throw new Error(`Opción inválida: ${flag} ${value}. Usa --diseno a|b --mesas N --formato 10x15|a6 --out directorio.`);
  }
  if (!Number.isSafeInteger(tables) || tables < 0 || tables > 200 || !Object.hasOwn(formats, format)) throw new Error('Usa de 0 a 200 mesas y formato 10x15 o a6.');
  return { tables, format, out, design };
}
export async function generatePrints(options = parseArgs([])) {
  const { tables, format, out, design } = options;
  if (!design) throw new Error('Para una tirada selecciona --diseno a o --diseno b. Para revisar las dos propuestas usa npm run generate:proposals.');
  const combined = await PDFDocument.create();
  combined.catalog.getOrCreateViewerPreferences().setPrintScaling(PrintScaling.None);
  combined.setTitle('Fusión x8 - tarjetas para mesas');
  const files: { table: number | null; url: string; svg: string; qrPdf: string; cardPdf: string; modules: number }[] = [];
  for (let index = 0; index <= tables; index++) {
    const table = index || undefined;
    const url = cartaUrl(table), code = createCode(url), name = table ? `mesa-${table}` : 'carta';
    const svg = `qr/${name}.svg`, qrPdf = `qr/${name}.pdf`, card = table ? `tarjetas/mesa-${table}.pdf` : 'tarjetas/tarjeta-general.pdf';
    const cardBytes = await cardPdf(code, url, format, table, design);
    for (const [file, bytes] of [[svg, qrSvg(code, url)], [qrPdf, await standaloneQr(code, url)], [card, cardBytes]] as const) {
      await mkdir(dirname(join(out, file)), { recursive: true });
      await writeFile(join(out, file), bytes);
    }
    if (table) {
      const source = await PDFDocument.load(cardBytes);
      const [page] = await combined.copyPages(source, [0]);
      combined.addPage(page);
    }
    files.push({ table: table ?? null, url, svg, qrPdf, cardPdf: card, modules: code.modules.size });
  }
  if (tables) await writeFile(join(out, 'tarjetas-mesas.pdf'), await combined.save());
  const manifest = { permanentUrl: cartaUrl(), tables, format, design, designName: designNames[design], trimMm: formats[format], bleedMm: config.bleedMm, qrSizeMm: config.qrSizeMm, quietZoneModules: quietZone, errorCorrectionLevel: correction, files };
  await writeFile(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return manifest;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  generatePrints(parseArgs(process.argv.slice(2))).then(result => console.log(`Generados QR SVG/PDF y tarjetas ${result.format}: general + ${result.tables} mesa(s). URL permanente: ${result.permanentUrl}`)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
