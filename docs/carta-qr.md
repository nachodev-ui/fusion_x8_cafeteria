# Carta permanente y propuesta para mesas

> Documento de la versión inicial. La revisión vigente, con entrada directa y dos diseños nuevos de 58 mm sin URL visible, está en [carta-qr-propuestas.md](carta-qr-propuestas.md). Los archivos y comandos de diseño de este documento se conservan como historial; usar los de la revisión vigente.

La dirección impresa es **https://fusion-x8-cafeteria.pages.dev/carta**. Cada QR codifica exclusivamente esa URL; la muestra de Mesa 1 codifica **https://fusion-x8-cafeteria.pages.dev/carta?mesa=1**. No se usa un acortador, proveedor de QR, enlace con vencimiento ni redirección de terceros.

## Propuesta actual

Como todavía se presentará al posible cliente y no está definida la cantidad de mesas, se entregan una tarjeta general y una muestra de Mesa 1. No se ha generado una tirada completa ni se ha publicado este cambio.

- `output/pdf/carta/tarjetas/tarjeta-general.pdf`: propuesta sin número de mesa.
- `output/pdf/carta/tarjetas/mesa-1.pdf`: muestra numerada.
- `output/pdf/carta/tarjetas-mesas.pdf`: reúne las mesas solicitadas (actualmente solo Mesa 1).
- `output/pdf/carta/qr/carta.svg` y `carta.pdf`: QR general vectorial.
- `output/pdf/carta/qr/mesa-1.svg` y `mesa-1.pdf`: QR de ejemplo por mesa.
- `output/pdf/carta/manifest.json`: URLs exactas, archivos y medidas para comprobar cada entrega.
- `scripts/generate-carta-print.ts`: plantilla editable y generación local.

Las tarjetas usan el logo existente, DM Sans y Dancing Script incrustadas, y los colores negro `#0b0b0b`, rojo `#d62828` y crema `#f5eee4`. Las fuentes también se sirven localmente en `/carta`; no se consulta Google Fonts al escanear. Las licencias OFL se incluyen en los paquetes `@fontsource/dm-sans` y `@fontsource/dancing-script` instalados mediante npm.

## Editar platos, precios y etiquetas

`src/data/products.json` sigue siendo la única fuente de la portada, los pedidos y `/carta`. El panel `/admin/` y su API existente modifican ese mismo archivo. No hay una segunda carta que sincronizar.

El estado `disponible` muestra el plato; `agotado` lo conserva con etiqueta y sin admitir pedidos en la portada; `oculto` lo retira. `price: null` se muestra como «Por confirmar», conservando el comportamiento previo. El panel permite seleccionar las etiquetas opcionales `vegetariano`, `sin-gluten` y `picante`. No se asignaron etiquetas dietéticas nuevas a los productos reales sin confirmación del local.

Los **nueve datos de ejemplo**, tres por cada categoría existente, están en `docs/examples/carta-ejemplo.json`. Son datos ficticios para demostración, con precios y etiquetas ilustrativos: no se publican ni sustituyen los productos actuales. Para una demostración con ellos, usar una copia del proyecto y sustituir allí el contenido de `src/data/products.json` por ese archivo. Nunca hacer esa sustitución en producción por accidente.

Una edición del panel conserva el flujo actual: guardado en Git → build de Pages → publicación. La firma de `menu-version.json` también contempla las etiquetas. No se cambia el QR, la ruta ni el diseño al editar un producto. Un cambio todavía no desplegado no puede aparecer en la carta estática; la duración de esa publicación depende del pipeline existente.

## Generación local

Requiere Node >= 22.12 y las dependencias del proyecto. Tras `npm ci`, la generación funciona sin red, sin servicios externos y sin pagos:

```sh
npm run generate:qr
npm run generate:qr -- --mesas 20
npm run generate:qr -- --mesas 0
npm run generate:qr -- --mesas 20 --formato a6 --out output/pdf/carta-a6
```

`--mesas N` genera la general y Mesa 1 a Mesa N (0 a 200). El valor por defecto es **1**, para esta propuesta. `--mesas 0` genera solo la general. Una salida nueva o la cantidad exacta de archivos indicada en `manifest.json` evita enviar a imprenta restos de una tirada anterior; el script no borra archivos previos. Los precios no intervienen en esta generación, así que no es necesario ejecutarla de nuevo al editarlos.

`config/carta-print.json` fija la URL pública independientemente de `.env`, `PUBLIC_SITE_URL` y las URLs de preview: un build de pruebas no debe crear QR de localhost o de un alias temporal. Mantener este valor después de imprimir. La URL visible de respaldo conserva el dominio y `/carta`, sin `https://`; la tarjeta numerada incluye también `?mesa=N`.

El QR mide **50 × 50 mm**, tiene corrección **H**, módulos negros sobre blanco y zona de silencio de **4 módulos**. No contiene logo superpuesto. Tanto el SVG como el PDF dibujan módulos vectoriales. La imagen del logo es la original del sitio; el QR no es una imagen raster.

## Medidas e impresión

La solicitud menciona A6 y 10 × 15 cm, que son medidas distintas. La propuesta usa la medida explícita **100 × 150 mm al corte**. `--formato a6` genera A6 ISO exacto de **105 × 148 mm** con el mismo diseño.

En ambos casos: **3 mm de sangrado por lado**, márgenes de seguridad de al menos 8 mm para texto y QR, y marcas de corte fuera del sangrado. El PDF de 10 × 15 tiene MediaBox de **116 × 166 mm**, TrimBox de **100 × 150 mm** y BleedBox de **106 × 156 mm**. Imprimir a **100 % / tamaño real**, sin «ajustar a página», y cortar por las marcas. El PDF declara `PrintScaling=None`. La imprenta debe conservar las cajas de página y los vectores; el documento es PDF estándar RGB con fuentes incrustadas, no PDF/X ni una conversión CMYK específica de imprenta. Elegir papel mate ayuda a evitar reflejos sobre el QR.

## Caché y rendimiento

`public/_headers` configura `Cache-Control: public, max-age=0, must-revalidate` para `/carta`, `/carta/` y `/carta/index.html`, también cuando hay parámetros. Cada apertura vuelve a validar el HTML; los assets de Astro conservan sus nombres con hash. Las páginas restauradas desde la caché de atrás/adelante se recargan y el enlace «Actualizar carta» conserva la mesa válida. Una pestaña que permanece abierta no se actualiza por sí sola: usar ese enlace o volver a escanear después de publicar.

La página entrega todos los platos desde el HTML, funciona sin JavaScript, usa enlaces de categoría pegajosos y no carga React, fotos de platos, mapas, iframes ni APIs externas. Incluye encabezados semánticos, enlace para saltar al contenido, foco visible, objetivos táctiles de al menos 44 px y texto de estado además del color. Solo un script pequeño muestra la mesa y gestiona la recarga desde la caché del navegador. El parámetro se valida como entero de 1 a 9999 y se inserta como texto. No es una identidad ni una autorización para hacer pedidos.

```sh
npm run check
npm test
npm run build
npm run verify:carta
npm run check:functions
npm run test:ui
```

`verify:carta` comprueba el HTML compilado y un presupuesto de transferencia inicial inferior a **120 KB** (HTML/CSS/JS con gzip, PNG y WOFF2). Guarda el resultado en `output/pdf/carta/build-check.json`. El presupuesto ayuda al objetivo de cargar en menos de 2 segundos, pero no garantiza una latencia en cualquier red: falta medir el despliegue real en teléfonos. Todas las comprobaciones de este trabajo son de datos, estructura, decodificación y DOM; **no se realizaron comprobaciones visuales**.

Resultado local del 1 de noviembre de 2026: **64 productos, 84,8 KB** de transferencia inicial estimada; comprobación de tipos y build correctos, **18 pruebas de datos/API/QR/PDF y 15 pruebas funcionales DOM aprobadas**, y compilación de Pages Functions correcta. También se extrajo el texto de los cinco PDF sin renderizarlos.

En tres cargas de la compilación con Edge, viewport móvil de 390 × 844, caché fría, descarga de **1,6 Mbps** y latencia simulada de **150 ms**, el evento de carga completa ocurrió a los **1006, 920 y 922 ms**, y el primer contenido apareció entre **480 y 564 ms**. Es una medición sintética sobre un preview local, sin emular CPU de teléfono; no acredita el rendimiento del hosting ni sustituye los dispositivos reales. El registro está en `output/pdf/carta/timing-check.json`. Para repetirla, iniciar `npm run preview -- --host 127.0.0.1 --port 4380` y ejecutar en otra terminal `node scripts/measure-carta.mjs`; admite como argumento una URL de despliegue a medir.

## Mantener el enlace para siempre

La permanencia depende de conservar el dominio y servir `/carta` o una redirección desde él. No borrar el proyecto de Pages ni dejar caducar un dominio propio futuro. No cambiar la dirección codificada después de imprimir. Si se adopta otro dominio, conservar el origen viejo y redirigir desde él; comprar un dominio nuevo no permite controlar automáticamente el dominio viejo.

Si en el futuro el contenido se muda a `/nueva-carta`, activar las dos reglas preparadas en `public/_redirects`, sustituyendo el destino por el real:

```text
/carta  /nueva-carta  301
/carta/ /nueva-carta  301
```

Conservar esas reglas indefinidamente. No activar la plantilla mientras `/carta` sea la página real, para evitar un destino inexistente. Verificar también `Location` y la conservación de `?mesa=1`. Mantener `/carta` fuera de Pages Functions para que se apliquen `_redirects` y `_headers` estáticos; actualmente `public/_routes.json` incluye solo `/api/admin/*`. Referencia: [redirecciones de Pages](https://developers.cloudflare.com/pages/configuration/redirects/).

No se encontró una integración de analítica de escaneos en el repositorio. No se añadió un servicio nuevo. Si se conecta analítica después, el parámetro `mesa` ya está disponible; un número en la URL indica el enlace abierto y puede compartirse, por lo que no prueba presencia física ni cuenta personas únicas.

## Checklist pendiente antes de imprimir una tirada

- [ ] Publicar y abrir `/carta` y `/carta?mesa=1` desde incógnito, sin cuenta, comprobando que Cloudflare Access no proteja esas rutas.
- [ ] Escanear la muestra con la cámara de un iPhone y Safari, y con un Android y Chrome.
- [ ] Probar con datos móviles y caché fría: anotar red, dispositivo y tiempo hasta poder leer la carta; objetivo < 2 s.
- [ ] Probar lectura en un entorno con poca luz, a distintas distancias y ángulos.
- [ ] Imprimir a tamaño real, medir 100 × 150 mm al corte y 50 mm de QR, y escanear el papel; repetir con el material y acabado definitivos.
- [ ] Comprobar las tres categorías, navegación por teclado/lector de pantalla, precios, estado agotado y etiquetas confirmadas por el local.
- [ ] Guardar un cambio de precio desde el panel, esperar su publicación verificada, volver a escanear **el mismo papel** y comprobar el nuevo precio. Mantener el SVG original sin regenerarlo.
- [ ] Comprobar cabeceras de revalidación en `/carta`, `/carta/`, `/carta/index.html` y `/carta?mesa=1`; revisar que ninguna regla personalizada de Cloudflare imponga una caché larga.
- [ ] Si se muda la ruta: comprobar HTTP **301**, destino final **200**, conservación de mesa y ausencia de bucles desde ambos enlaces antiguos.
- [ ] Acordar con el cliente la cantidad de mesas, generar N y enviar únicamente los archivos enumerados en el manifiesto de esa tirada.

Las pruebas de dispositivos, papel, iluminación, rendimiento de producción y cambios mediante credenciales reales quedan pendientes de esa validación física y del despliegue; no se han marcado como realizadas.
