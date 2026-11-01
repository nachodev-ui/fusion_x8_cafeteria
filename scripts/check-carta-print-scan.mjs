import sharp from 'sharp';
import jsQR from 'jsqr';
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';

const out = 'output/pdf/carta/propuestas';
const manifest = JSON.parse(await readFile(`${out}/manifest.json`, 'utf8'));
const checks = [];
for (const file of manifest.files) {
  for (const dpi of [150, 300]) {
    const path = `${out}/propuesta-${file.design}-mesa-1-${dpi}dpi-con-marcas.png`;
    // Whole card, not just a synthetic QR crop: logo/decorations remain present.
    const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);
    assert.equal(decoded?.data, file.url, `${file.design}, ${dpi} dpi no se decodifica`);
    checks.push({ design: file.design, dpi, wholeCardDecoded: true, url: decoded.data });
  }
  const path = `${out}/propuesta-${file.design}-mesa-1-150dpi-con-marcas.png`;
  const { data, info } = await sharp(path).modulate({ brightness: .35 }).blur(.4).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(jsQR(new Uint8ClampedArray(data), info.width, info.height)?.data, file.url, 'Simulación oscura/desenfocada');
  checks.push({ design: file.design, dpi: 150, brightnessSimulation: .35, blurSigma: .4, wholeCardDecoded: true, url: file.url });
}
await writeFile(`${out}/scan-check.json`, JSON.stringify({ checks, qrSizeMm: manifest.layout.qr.size, printScaling: '100%', physicalPrintTest: 'pendiente: prueba digital, no papel ni cámara real' }, null, 2) + '\n');
console.log(`${checks.length} lecturas digitales correctas en ambas propuestas, con el QR a escala real de 58 mm. La prueba física de papel sigue pendiente.`);
