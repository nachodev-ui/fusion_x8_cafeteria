# Fusión x8

## Desplegar en Cloudflare Pages desde GitHub

Conectar el repositorio `nachodev-ui/fusion_x8_cafeteria` desde Workers & Pages y crear un proyecto **Pages** con integración Git.

- Rama de producción: `main`.
- Framework: Astro.
- Directorio raíz: raíz del repositorio (dejar vacío).
- Comando de compilación: `npm run build`.
- Directorio de salida: `dist`.
- Node.js: 22 (declarado en `.node-version`).

En las variables de entorno de Cloudflare, definir `PUBLIC_SITE_URL` con la URL definitiva `https://<proyecto>.pages.dev` y volver a desplegar. `PUBLIC_GOOGLE_MAPS_API_KEY` es opcional: solo configurarla si se desean consultas de Google con facturación y restricciones de origen apropiadas. El archivo `.env` local no se incluye en Git. No configurar un comando de despliegue de Workers: este proyecto genera archivos estáticos para Pages.

Cada push a `main` activará una nueva compilación y publicación después de conectar el repositorio. Antes de aceptar pedidos, completar el teléfono real y confirmar los datos pendientes indicados abajo.

Landing demo de una sola página, con Astro, Tailwind CSS y una única isla React para armar el pedido por WhatsApp. Sitio estático, sin backend ni otras librerías de interfaz.

## Desarrollo

Requiere Node.js 22.12 o superior.

```sh
npm install
npm run dev
```

```sh
npm run build
```

La salida estática queda en `dist/`. `npm run preview` sirve esa compilación localmente, si luego necesitas revisarla.

## Qué editar

- `src/data/menu.ts`: **todos** los productos, categorías, grupos, descripciones y precios, transcritos de las imágenes compartidas. Los precios conocidos son enteros en CLP; el formateo usa `es-CL`. Un precio `null` se muestra como «Por confirmar».
- `src/data/business.ts`: dirección, referencia de ubicación, horarios, servicios, WhatsApp, mensaje inicial y redes sociales.
- `src/pages/index.astro`: textos de las secciones y SEO.
- `src/styles/global.css`: diseño responsive, colores y animaciones. Incluye soporte para movimiento reducido.
- `public/images/`: logo, ilustraciones SVG y dos fotos del propietario obtenidas de Google Maps. No hay hotlinks de imágenes.
- `src/data/google-maps.json`: datos de la ficha consultados el 30/10/2026, con fuente, fecha, Place ID, reseñas resumidas, concurrencia relativa y procedencia de las fotos.
- `src/components/GooglePlace.astro`: calificación y tarjetas de opiniones; la concurrencia se consulta en un desplegable secundario.
- `src/lib/google-reviews.ts`: actualización de calificación y reseñas mediante Places API (New), conservando autores y enlaces.
- `public/references/`: las siete imágenes originales aportadas. La carta está disponible en el desplegable «Ver carta original»; ubicación, servicios y horarios se enlazan desde «Visítanos».

## Información incorporada

La dirección es Av. Ejército Libertador 905, esquina Domingo Tocornal, Ciudad del Sol, Puente Alto. La ubicación conserva la ilustración oscura original, con la dirección real y un enlace para llegar en Google Maps. La ilustración se identifica como tal y no representa la cartografía exacta.

El horario informado es martes a domingo de 15:30 a 22:00 hrs., con lunes cerrado. Se destacan pet friendly **en todo el local**, terraza exterior, calefacción en invierno y sillas de bebé.

La carta mantiene las tres pestañas principales y se organiza en café, té, bebestibles, agregados, copas de helado, barquillos, sándwiches, pasteles y postres. No se conservan los productos inventados de la primera versión.

Algunos valores de las imágenes están cortados: chocolate caliente, frappuccino, cortado, los tres barquillos, agregados de sándwich, Fondue Fusión y volcán de chocolate. Se dejaron como `null` para confirmar. El nombre de un dulce relleno también aparece incompleto y se identifica como pendiente. Los originales siguen disponibles para contrastar la transcripción.

## Completar antes de publicar

1. Confirmar los precios que están como `null` y el nombre incompleto en `src/data/menu.ts`. No completar los dígitos por suposición.
2. Confirmar con el local la vigencia de la información transcrita en `src/data/business.ts`.
3. Completar `whatsappNumber` con el teléfono real en formato `56912345678` (solo dígitos) y actualizar `whatsappDisplay`.
4. Copiar `.env.example` a `.env` y definir `PUBLIC_SITE_URL` con el dominio real para generar canonical y URLs absolutas de Open Graph. Volver a compilar.

El botón «Ver mapa interactivo» permite alternar entre la vista oscura y el mapa de Google dentro del mismo panel. El iframe solo recibe su URL y se carga cuando la persona activa esa opción; sus colores y controles originales se conservan. Los botones se sitúan fuera del mapa, sin tapar sus controles o atribuciones. Sin JavaScript, la vista ilustrativa y el enlace «Cómo llegar» siguen disponibles. El mapa usa la dirección informada en `business.ts` y no necesita una API key.

Hasta configurar un WhatsApp chileno válido, los botones permiten explorar el pedido, pero su envío queda deshabilitado con un aviso de demo. Con el número configurado, el botón flotante abre WhatsApp con un mensaje prellenado; el pedido envía cantidades, subtotales, total referencial y comentarios. El mensaje **se prepara**: la persona lo envía desde WhatsApp. No hay pago ni confirmación automática.

Se pueden incluir productos con precio pendiente en la consulta. Si los hay, el resumen muestra un **subtotal conocido**, excluye esos valores del cálculo y solicita confirmación del total final. Si todos los precios del pedido están pendientes, muestra «Por confirmar» en lugar de un total de cero.

## Arquitectura

- Astro genera todo el contenido estático. La carta sigue visible incluso sin JavaScript.
- Las pestañas accesibles y el menú móvil usan JavaScript nativo, sin React.
- `src/components/WhatsAppOrder.tsx` es el único componente React, hidratado con `client:load`.
- El pedido usa un `dialog` nativo con manejo de foco, cierre con Escape y bloqueo de scroll del fondo. Los datos viven solo en memoria durante la visita.
- Google Fonts sirve Dancing Script únicamente para títulos y DM Sans para el resto. El mapa embebido y la consulta opcional de reseñas son las otras integraciones externas. Las fotos del local son archivos locales; los avatares de reseñas actualizadas se sirven desde Google.

## Verificación

Comprobar `npm run build` y `node_modules/.bin/tsc.cmd --noEmit`. Para cambios de diseño, verificar la sección en el navegador y comprobar el desplegable de concurrencia. Para comprobar los datos actualizados se necesitan una clave válida, las APIs habilitadas y el origen de la vista previa autorizado.

## Google Maps: datos incorporados y conexión opcional

La galería muestra dos fotos de la categoría **Del propietario**, atribuidas a Fusión X8: cinnamon rolls y sándwiches. Se conservan sus identificadores, URLs de origen y crédito en `src/data/google-maps.json`. El resto de las fotos sigue accesible desde la ficha. **Opiniones** prioriza una franja con la nota final y el número de reseñas, seguida de tres tarjetas. La concurrencia queda debajo en un desplegable cerrado inicialmente. Se eliminó el panel de Places UI Kit con su desplazamiento interno.

La copia inicial muestra 4,7/5 y 389 opiniones, con tres resúmenes identificados como tales, consultados el **30 de octubre de 2026**. Si falta la clave o falla la conexión, se conserva esa fecha. El JSON de esa copia sigue disponible en `/data/fusion-x8-google.json`. Las horas punta también son una copia consultada ese día: actividad relativa al máximo semanal, no aforo ni ocupación en vivo. La franja de las 15 h incluye la apertura a las 15:30. El lunes se identifica como cerrado sin inventar ceros. Dentro del desplegable, todos los días pueden consultarse sin JavaScript; con JavaScript se activa el selector y se elige inicialmente el día de Santiago.

Para actualizar la calificación y las reseñas dentro del diseño del sitio:

1. Configurar un proyecto de Google Cloud con facturación y habilitar **Maps JavaScript API** y **Places API (New)**. Si la clave solo permitía Places UI Kit, añadir Places API (New) a las APIs permitidas. Esta consulta se factura como Place Details según los campos solicitados, con precios diferentes a UI Kit.
2. Añadir `PUBLIC_GOOGLE_MAPS_API_KEY` a `.env`. Es una clave de navegador visible públicamente: restringirla mediante referentes HTTP al dominio del sitio y mediante restricciones de API a los servicios necesarios. No usar una clave privada de servidor.
3. Reiniciar el servidor de desarrollo o volver a ejecutar `npm run build`. La portada consulta `rating`, `userRatingCount`, `reviews`, `attributions` y `photos`; Opiniones reutiliza la respuesta al acercarse a la vista. Solo se hace una solicitud de Place Details por carga de página. No hay consultas periódicas ni almacenamiento de resultados en disco o localStorage.

La respuesta sustituye la nota, el total y las tarjetas en su sitio. Se respeta el orden de relevancia de Google, sin filtrar por estrellas. Inicialmente se muestran tres reseñas; un botón permite ver las restantes de la selección devuelta. Los textos largos se expanden mediante «Leer más». Cada tarjeta conserva nombre, avatar cuando exista, perfil del autor, fecha relativa y enlace a la reseña. La atribución Google Maps y los créditos de proveedores permanecen junto al contenido. Si la consulta falla o tarda más de 20 segundos, se mantiene la copia con su fecha y el acceso a Google Maps. Los resultados en vivo no modifican las fotos locales, las horas punta ni el JSON inicial.

Documentación oficial: [reseñas con Place.fetchFields](https://developers.google.com/maps/documentation/javascript/place-reviews), [atribuciones](https://developers.google.com/maps/documentation/javascript/policies), [habilitar Places API (New)](https://console.cloud.google.com/apis/library/places.googleapis.com).

## Portada y galería de fotos recientes

`src/data/google-media.json` contiene la selección comprobada desde julio de 2025, con fecha visible en Maps, autor e identificador de cada foto. Places API no proporciona fechas de fotos: se verificaron en la ficha. La galería obtiene URLs nuevas con `Photo.getURI()` para cada visita. La imagen local de cinnamon rolls de julio de 2026 permanece como respaldo de la galería si falta JavaScript, la clave o la conexión.

La portada usa una versión local **restaurada con IA** de la foto de Nuretam de abril de 2026: `src/assets/venue/fusion-x8-exterior-restaurado-horizontal.png` (1942 × 809). La entrada para restaurarla fue la foto original a 3000 × 4000, en lugar de la reducción a 1800 px antes utilizada. Se conserva el crédito, el enlace original y la indicación «Imagen restaurada». La imagen se entrega desde el primer HTML como WebP de calidad 95, con prioridad alta y sin depender de la API. Se sirve a su ancho completo para evitar que `object-fit: cover` amplíe una variante reducida. La API no sustituye este archivo restaurado. El proceso y los prompts están en `output/imagegen/portada-restaurada-prompts.txt`; no se presenta la restauración como una captura original sin editar.

La portada conserva el texto y los botones sobre un degradado para facilitar su lectura; las fotos mantienen atribuciones y enlaces. La foto de sándwiches de 2024 se conserva como fuente histórica, pero dejó de mostrarse. El vídeo de entrada de enero de 2026 se enlaza desde la galería: dura un segundo y no se usa como fondo. La API utilizada no devuelve archivos de vídeo. La selección, las exclusiones y las fuentes se documentan en `output/google-maps-media-2026-10-30.md`.
