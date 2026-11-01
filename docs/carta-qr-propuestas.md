# Carta QR: acceso directo y dos propuestas de mesa

## Estado de la entrega

Esta revisión sustituye el diseño inicial: hay **dos propuestas de Mesa 1**, todavía sin elegir una ni generar una tirada final. La cantidad de mesas sigue sin estar definida por el posible cliente. Los PDF de esta carpeta son muestras para revisión y prueba, no un set aprobado. Los archivos anteriores siguen disponibles como versión inicial; no enviarlos como el nuevo diseño.

Carpeta vigente: `output/pdf/carta/propuestas/`.

- `comparativa-propuestas.png`: comparación A/B para elegir.
- `propuesta-a-vista-previa.png` y `propuesta-b-vista-previa.png`: vistas al corte.
- `propuesta-a-mesa-1.pdf` y `propuesta-b-mesa-1.pdf`: muestras PDF con sangrado y marcas.
- `manifest.json`: URLs, estado de propuesta y coordenadas físicas del QR.
- `pdf-check.json`, `scan-check.json`, `landing-check.json`: resultados verificables de estructura, decodificación y acceso a la carta.

## Acceso por QR

Se conserva exactamente **https://fusion-x8-cafeteria.pages.dev/carta**, y por mesa **https://fusion-x8-cafeteria.pages.dev/carta?mesa=N**. No se modifica el contenido de los QR ya impresos ni se añaden hashes al QR. La fuente de productos, el panel, los estados y la revalidación siguen siendo los existentes.

`src/lib/carta-entry.ts` usa la ruta `/carta` como disparador. Posiciona el navegador con `scrollTo` tras disponer del DOM y un frame de layout, midiendo la altura real de las cabeceras fijas o pegajosas. Reajusta tras cargar fuentes, imágenes y cambios del área visible; `ResizeObserver` observa la caja completa, incluidos los márgenes interiores de la cabecera y la introducción. No espera una cantidad arbitraria de segundos ni depende exclusivamente de un hash.

En `/carta`, un marcador sin altura justo antes del menú de categorías es el punto de llegada. La marca y la introducción quedan por encima; el acceso al resto del local sigue en la cabecera y el pie. El parámetro de mesa se mantiene en la URL y el enlace de actualizar, sin duplicarlo ni escribirlo en HTML sin validar. No se añadió una herramienta de analítica externa.

Los enlaces normales `#carta` de la portada usan la misma función y aterrizan junto a sus categorías, descontando el header del sitio. Se preserva la navegación normal de las categorías. En cuanto el visitante toca, hace clic, usa la rueda o el teclado, cesan los ajustes automáticos para evitar devolverlo arriba mientras lee un plato. Una entrada desde el historial vuelve a tratar la ruta de carta; la recarga existente desde bfcache conserva la revalidación de precios.

No se verificó el despliegue público desde este entorno. Las comprobaciones del acceso se hacen contra la **compilación local**, no acreditan una publicación en Cloudflare. Es necesario desplegar el proyecto completo antes de comprobar el papel contra la URL pública; una copia antigua sin `/carta` puede terminar en la portada por el fallback del hosting.

## Los diseños

**A: Rojo envolvente.** Fondo negro, gran acento curvo rojo lateral, título crema, panel crema redondeado y detalles de granos de café muy discretos. Número pequeño arriba a la izquierda.

**B: Sello crema.** Logo sobre negro, título script dentro de una cápsula roja y una zona inferior crema envolviendo el QR. Número pequeño arriba a la derecha. Instrucción y cierre en negro sobre crema.

Ambos usan el logo original sobre **negro puro `#000000`**, que coincide exactamente con los píxeles opacos de su fondo. No se retocó ni recoloreó el logo. La paleta conserva rojo `#d62828` y crema `#f5eee4`; DM Sans y Dancing Script permanecen incrustadas. Los detalles tenues usan tintas sólidas, evitando diferencias de transparencias entre lectores e impresoras PDF.

No hay URL visible en las tarjetas. El texto sigue esta jerarquía: logo → «Escanea para ver» → «nuestra carta» → QR → cámara dibujada en vector y «Apunta la cámara de tu celular» → «Cafetería & Heladería». Mesa 1 es una etiqueta discreta.

## Tamaño y seguridad del QR

La tarjeta de muestra mide **100 × 150 mm al corte**, según la medida explícita solicitada. Se mantienen **3 mm de sangrado**, marcas fuera del sangrado y margen seguro para texto y QR. El MediaBox es 116 × 166 mm, el TrimBox 100 × 150 mm y el BleedBox 106 × 156 mm. La alternativa `--formato a6` genera A6 ISO exacto de 105 × 148 mm.

El QR mide **58 × 58 mm**: ocupa el 58 % del ancho de 100 mm y el 55,2 % del A6 ISO. Conserva corrección **H**, cuatro módulos blancos completos de silencio y módulos vectoriales negros sobre blanco. Está dentro de un panel redondeado de **66 × 66 mm**, con 4 mm adicionales de espacio por cada lado. No se recortan esquinas del QR, no se superpone el logo y no se imprimen decoraciones sobre la zona de silencio.

Imprimir los PDF a **100 % / tamaño real**, sin ajustar a página, y cortar por las marcas. `PrintScaling=None` está declarado en el PDF. Los PNG son vistas previas; los PDF vectoriales son los archivos para imprimir la muestra. El documento es PDF estándar RGB, no PDF/X ni una conversión CMYK particular de imprenta.

## Generar muestras y preparar el set elegido

```sh
npm run generate:proposals
python scripts/render-carta-proposals.py
node scripts/check-carta-print-scan.mjs
```

El render usa Poppler y Python con Pillow y pypdf. En este entorno se utilizó el runtime de documentos incluido en Codex. La generación del PDF y del QR sigue siendo local, sin servicios de pago ni red una vez instaladas las dependencias npm.

Cuando se haya elegido el diseño y definido N, el generador ya admite la tirada completa. Ejemplos de uso, **no ejecutados para producir una tirada**:

```sh
npm run generate:qr -- --diseno a --mesas 20 --out output/pdf/carta/tirada-a
npm run generate:qr -- --diseno b --mesas 20 --formato a6 --out output/pdf/carta/tirada-b-a6
```

`--diseno a|b` es obligatorio para una tirada: la herramienta no elige por el cliente. Produce la general, Mesa 1 a Mesa N, PDF agrupado, QR SVG/PDF y manifiesto. Para una muestra general sola, usar `--mesas 0`. La ruta y los parámetros no dependen del diseño, los precios ni los platos.

## Verificación reproducible

```sh
npm run check
npm test
npm run build
npm run verify:carta
npm run test:ui
npm run preview -- --host 127.0.0.1 --port 4380
```

Con ese preview abierto, ejecutar `node scripts/check-carta-landing.mjs` en otra terminal. Requiere el WebKit de Playwright instalado, además de Edge. Si se instala en un directorio alternativo, definir `PLAYWRIGHT_BROWSERS_PATH` para ambas operaciones. Puede recibir otra URL de origen como argumento para comprobar un despliegue real.

La comprobación de acceso usa Chromium con un perfil Android y **el motor WebKit con un perfil iPhone**. Cubre `/carta`, `/carta/`, Mesa 1 de ambas propuestas, otro número de mesa, `/#carta` y el enlace normal «Ver carta». Retarda recursos 450 ms, induce cambios de altura tardíos, prueba una cabecera fija de 72 px y comprueba que elegir una categoría no provoca un retorno forzado arriba. Es emulación de navegador, no un iPhone/Android físico ni una sesión real en la cámara.

La comprobación del PDF extrae el texto y mide sus cajas. Poppler renderiza el diseño completo a **150 y 300 dpi**, conservando la escala física de 58 mm. El decodificador local lee ambos QR desde esas tarjetas completas y también desde una variante de 150 dpi con brillo al 35 % y desenfoque leve. Son **seis decodificaciones digitales**, que no sustituyen el papel, la óptica ni la iluminación reales.

Resultado de esta revisión: **18 pruebas de datos/API/QR/PDF y 15 pruebas funcionales DOM aprobadas**, build y tipos correctos; **12 accesos** aprobados en Chromium/WebKit y las **seis lecturas digitales** correctas. La carga inicial compilada se mantiene en aproximadamente **86 KB**, incluyendo los módulos JS compartidos y las tres fuentes locales.

Las vistas previas sí se revisan visualmente en esta revisión, porque ahora se solicitaron expresamente. Se conserva la configuración de pruebas del sitio sin capturas, vídeo ni trazas del navegador.

## Pendiente antes de una tirada final

- [ ] Elegir A o B y definir el número de mesas con el cliente.
- [ ] Publicar la versión que contiene `/carta` y comprobar que el QR público no pasa por login ni cae en la portada.
- [ ] Imprimir una muestra a 100 %, medir el corte y los 58 mm del QR y escanearla con iPhone/Safari y Android/Chrome, también desde el navegador de la cámara.
- [ ] Repetir con poca luz, distintos ángulos, distancia de mesa y el acabado de papel definitivo.
- [ ] Comprobar en datos móviles lentos que las categorías quedan a la vista tras la carga.
- [ ] Cambiar un precio desde el panel, esperar la publicación y volver a escanear **el mismo papel**, sin regenerar el QR.
- [ ] Mantener el dominio y `/carta` indefinidamente; si cambia el destino, activar las reglas 301 preparadas en `public/_redirects`, conservando la mesa.

No se afirma haber impreso ni probado teléfonos físicos desde este entorno.
