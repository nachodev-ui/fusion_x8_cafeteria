import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { cartaUrl, createCode, cardPdf, cardLayout, designNames, type CardDesign } from './generate-carta-print';

const out = 'output/pdf/carta/propuestas';
await mkdir(out, { recursive: true });
const url = cartaUrl(1);
const code = createCode(url);
const files = [];
for (const design of ['a', 'b'] as CardDesign[]) {
  const file = `propuesta-${design}-mesa-1.pdf`;
  await writeFile(join(out, file), await cardPdf(code, url, '10x15', 1, design));
  files.push({ design, name: designNames[design], file, table: 1, url });
}
await writeFile(join(out, 'manifest.json'), JSON.stringify({ status: 'propuestas-pendientes-de-eleccion', finalSetGenerated: false, trimMm: { width: 100, height: 150 }, bleedMm: 3, layout: cardLayout('10x15'), errorCorrectionLevel: 'H', quietZoneModules: 4, files }, null, 2) + '\n');
console.log('Dos propuestas de Mesa 1 generadas. Sin selección automática ni tirada final.');
