"""Render the two draft PDFs with Poppler; export trim previews and check text/boxes."""
from pathlib import Path
import json
import shutil
import subprocess
from PIL import Image, ImageDraw, ImageFont
from pypdf import PdfReader

out = Path('output/pdf/carta/propuestas')
poppler = shutil.which('pdftoppm')
if not poppler:
    raise RuntimeError('Instala Poppler y agrega pdftoppm al PATH.')
report = []
for design in ('a', 'b'):
    stem = out / f'propuesta-{design}-mesa-1'
    pdf = PdfReader(stem.with_suffix('.pdf'))
    page = pdf.pages[0]
    text = page.extract_text()
    assert 'Escanea para ver' in text and 'nuestra carta' in text
    assert 'Apunta la cámara de tu celular' in text
    assert 'Cafetería & Heladería' in text and 'Mesa 1' in text
    assert 'https://' not in text and 'pages.dev' not in text and '/carta' not in text
    mm = lambda points: float(points) * 25.4 / 72
    assert abs(mm(page.trimbox.width) - 100) < .01
    assert abs(mm(page.trimbox.height) - 150) < .01
    assert abs(mm(page.bleedbox.width) - 106) < .01
    for dpi in (150, 300):
        target = Path(f'{stem}-{dpi}dpi-con-marcas')
        subprocess.run([poppler, '-singlefile', '-r', str(dpi), '-png', str(stem.with_suffix('.pdf')), str(target)], check=True)
        image = Image.open(target.with_suffix('.png'))
        if dpi == 150:
            # PDF coordinates originate at the bottom; preview shows final trim.
            box = tuple(round(value * dpi / 72) for value in (
                float(page.trimbox.left), float(page.mediabox.top) - float(page.trimbox.top),
                float(page.trimbox.right), float(page.mediabox.top) - float(page.trimbox.bottom)))
            image.crop(box).save(out / f'propuesta-{design}-vista-previa.png', dpi=(dpi, dpi))
    report.append({'design': design, 'pdf': str(stem.with_suffix('.pdf')), 'trimMm': [100, 150], 'bleedMm': 3, 'visibleUrl': False, 'qrSizeMm': 58, 'physicalPrintTest': 'pendiente; solo renderizado digital a 150 y 300 dpi'})
(out / 'pdf-check.json').write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
previews = [Image.open(out / f'propuesta-{design}-vista-previa.png').convert('RGB') for design in ('a', 'b')]
gap, pad, heading = 28, 24, 60
comparison = Image.new('RGB', (sum(image.width for image in previews) + gap + pad * 2, max(image.height for image in previews) + heading + pad * 2), '#e5e0d8')
draw = ImageDraw.Draw(comparison)
font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 22)
left = pad
for image, label in zip(previews, ('A · Rojo envolvente', 'B · Sello crema')):
    draw.text((left, pad + 8), label, fill='#1c1715', font=font)
    comparison.paste(image, (left, pad + heading))
    left += image.width + gap
comparison.save(out / 'comparativa-propuestas.png')
print('Vistas previas al corte y renders a 150/300 dpi generados. Texto y cajas de impresión correctos.')
