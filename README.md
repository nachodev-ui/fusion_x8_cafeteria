# Fusión x8

## Administración de la carta

Implementada en `/admin/` (también accesible como `/admin` en Pages). **Requiere conectar DecapBridge y verificar el circuito real antes de entregarlo como operativo al dueño.** Sin las cuatro variables obligatorias `CMS_BRIDGE_*` completas, muestra un aviso de configuración y no habilita un backend local, una sesión ficticia ni escritura anónima.

### Arquitectura y elección

Decap CMS 3.17.3, con un único campo adaptado para administrar productos, usa el backend oficial Git Gateway con PKCE y **DecapBridge Cloud** para autenticación, invitaciones y acceso autorizado a GitHub. El dueño entra por correo y puede usar contraseña del proveedor, Google o Microsoft; no necesita cuenta de GitHub. No se construyó un sistema de contraseñas. La interfaz propia está en español; las páginas de acceso externas dependen de las traducciones de DecapBridge.

La carta persiste exclusivamente en `src/data/products.json`. Astro la lee al compilar y pasa al pedido los productos visibles de esa misma fuente. Las categorías y grupos son configuración fija en `src/data/menu-config.ts`; las imágenes se resuelven con imports de Astro en `src/data/menu.ts`. El panel no incluye productos en su bundle ni obtiene el documento del repositorio antes de autenticar. Los productos públicos de la carta son, naturalmente, contenido público; para mantener también el archivo fuente privado debe usarse un repositorio privado.

El HTML de administración es público, igual que una página de acceso. La autorización real corresponde al servicio de autenticación y al gateway de DecapBridge: sin una sesión autorizada para este sitio no deben permitir ni leer el documento privado ni escribir en Git. `robots.txt`, la etiqueta robots y `_headers` excluyen el panel de indexación, pero no se usan como control de acceso. No hay registro público de administradores de esta carta: solo invitaciones al sitio. Crear una cuenta general de DecapBridge no concede acceso a este repositorio.

No se necesita adaptador SSR, Pages Functions, Worker, base de datos del proyecto ni endpoint de autenticación propio: DecapBridge hospeda los endpoints reales de autenticación y gateway. Sigue siendo un build estático de Astro para Cloudflare Pages con integración Git. No se usa la opción `local_backend` de Decap. Los productos no se guardan en localStorage. Decap puede mantener su sesión y caché de trabajo en el navegador; el repositorio es la persistencia definitiva.

Se usa una adaptación pequeña de persistencia (`src/admin/persistence.ts`) sobre el backend oficial: conserva login, logout, PKCE y renovación de tokens de Decap, y guarda el único JSON mediante la API Contents de GitHub a través del gateway. Cada escritura incluye el SHA del documento leído; GitHub rechaza versiones obsoletas de forma atómica. No se utiliza la escritura incondicional de un árbol Git ni una comprobación previa susceptible a carreras. La validación compartida se ejecuta en el formulario, antes de guardar, al preparar el JSON y obligatoriamente en Cloudflare antes de publicar (`npm run build`). Un usuario que eluda validaciones del navegador podrá producir un commit inválido si tiene permiso de escritura, pero ese commit no superará el build ni sustituirá la web correcta. La carta se limita a 2000 productos y 750 KB de JSON para mantenerse bajo el límite de lectura completa de Contents API.

Fuentes oficiales comprobadas el **30 de octubre de 2026**:

- [DecapBridge: configuración y permisos](https://decapbridge.com/docs/getting-started), [arquitectura del proveedor](https://decapbridge.com/docs/architecture): invitaciones por correo, repositorios GitHub/GitLab y autenticación mantenida. PKCE permite SSO en Decap posterior a 3.8.3.
- [Decap: Git Gateway y PKCE](https://decapcms.org/docs/git-gateway-backend/), [campos personalizados y validación](https://decapcms.org/docs/custom-widgets/), [eventos de guardado](https://decapcms.org/docs/registering-events/).
- [GitHub Contents API](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents): actualización con SHA, permisos Contents y respuesta de conflicto. La adaptación está limitada a GitHub y `main`.
- [Cloudflare: integración Git](https://developers.cloudflare.com/pages/configuration/git-integration/) y [límites](https://developers.cloudflare.com/pages/platform/limits/): builds automáticos al cambiar la rama.
- Se descartó Netlify Git Gateway para una integración nueva porque su [documentación oficial lo declara deprecado](https://docs.netlify.com/manage/security/secure-access-to-sites/git-gateway/).

### Interfaz y fluidez del panel

El panel comparte el logo, la tipografía DM Sans/Dancing Script, el fondo oscuro y los tonos crema y rojo de la web. Incluye miniaturas de las cinco imágenes existentes (sin carga de fotos), edición en un panel separado y controles con foco de teclado. En celular el editor pasa arriba del listado y recibe el foco al abrir un producto. El selector de estado de cada fila permite marcar disponible, agotado u oculto sin abrir el formulario; el cambio queda sin guardar hasta usar la acción de guardado del gestor.

La lista muestra hasta **12 productos por página**. Buscar o cambiar filtros vuelve a la primera página; crear un producto limpia los filtros y lo lleva a su página. Cambiar de página o filtrar no consulta de nuevo GitHub y conserva todas las modificaciones. Se reutilizan la conversión de datos y la validación cuando el documento no cambia, y las solicitudes simultáneas de lista/editor comparten una lectura en curso. Una apertura posterior vuelve a leer el SHA del repositorio para mantener la detección de conflictos.

En una entrada normal a /admin/, al terminar el login se abre directamente la carta; se conservan los marcadores explícitos y las URLs de retorno de autenticación. Los estilos del marco de Decap están limitados a su raíz y a las etiquetas de componentes de la versión fijada: al actualizar el gestor hay que revisar esa compatibilidad.

La carga inicial sigue incluyendo el runtime oficial de Decap (aproximadamente 4,9 MB sin compresión), que se sirve desde CDN; se inicia la conexión al CDN desde el encabezado. La paginación reduce el trabajo de la interfaz, no el tamaño del documento ni el tiempo de escritura en GitHub. Guardar y publicar siguen siendo procesos externos y distintos; no se afirma una reducción medida de su demora en producción. Las pruebas de interacción usan DOM, sin capturas ni inspecciones visuales, e incluyen el formulario nativo tanto a 1280 como a 390 px.

### Costos y dependencias

[DecapBridge](https://decapbridge.com/) anuncia un plan gratuito con **3 sitios y 10 colaboradores por sitio**; Professional figura a **USD 9/mes** y Lifetime a **USD 199**. No se requiere un plan de pago para un dueño en un sitio. Cloudflare Pages Free permite **500 builds por mes**, uno simultáneo, con timeout de 20 minutos. Cada guardado del panel consume potencialmente un build: conviene agrupar cambios. GitHub aplica sus permisos, disponibilidad y límites de API. Revisar condiciones y precios al activar el servicio; no se contrató ningún plan durante esta implementación.

Decap se descarga de jsDelivr solamente en el panel, con versión fija y hash de integridad SRI. Al actualizarlo hay que actualizar ambos, revisar la adaptación de persistencia y repetir las pruebas. El panel necesita conectividad a jsDelivr, DecapBridge, su gateway y, si se elige, Google/Microsoft. Si el proveedor no responde, no se podrán administrar productos; la última carta publicada permanece accesible. No se ha contratado un SLA ni verificado disponibilidad externa.

### Configuración externa exacta pendiente

1. En GitHub, comprobar que `nachodev-ui/fusion_x8_cafeteria` y su rama `main` contienen esta implementación. El responsable técnico debe crear un **fine-grained PAT**, limitado a este repositorio, con **Contents: Read and write** y Metadata de lectura implícita. No hace falta permiso Pull requests porque no hay flujo editorial. Definir vencimiento, registrar responsable y rotarlo antes de vencer. Si la organización exige aprobación del token, obtenerla.
2. Crear la cuenta técnica en [DecapBridge](https://decapbridge.com/), añadir un Site, elegir GitHub, repositorio `nachodev-ui/fusion_x8_cafeteria` y registrar el PAT **únicamente en el campo privado Git access token del proveedor**. No pegarlo en Git, `.env`, Cloudflare, frontend o este chat. Este permiso alcanza el contenido del repositorio, no únicamente el JSON; no conceder acceso del CMS a personas no confiables.
3. Elegir autenticación **PKCE**. Configurar la URL exacta del panel de producción, preferentemente `https://DOMINIO-DEFINITIVO/admin/`. Copiar los valores del bloque `backend` generado por DecapBridge a variables de entorno de Cloudflare Pages según esta tabla. No copiar otras colecciones, no activar `local_backend`, registro abierto ni editorial workflow.

| Valor generado por DecapBridge | Variable del build |
| --- | --- |
| `base_url` | `CMS_BRIDGE_BASE_URL` |
| `app_id` (opcional, solo si aparece) | `CMS_BRIDGE_CLIENT_ID` |
| `gateway_url` (copiar tal cual, incluido el dominio sin sufijo) | `CMS_BRIDGE_GATEWAY_URL` |
| `auth_endpoint` | `CMS_BRIDGE_AUTH_ENDPOINT` |
| `auth_token_endpoint` | `CMS_BRIDGE_TOKEN_ENDPOINT` |
| `status_endpoint` (opcional, solo si aparece) | `CMS_BRIDGE_STATUS_ENDPOINT` |

Las cuatro variables obligatorias son BASE_URL, GATEWAY_URL, AUTH_ENDPOINT y TOKEN_ENDPOINT. CLIENT_ID y STATUS_ENDPOINT son opcionales: si no aparecen en el bloque generado, dejarlas sin configurar. El gateway puede ser `https://gateway.decapbridge.com`; el backend oficial descubre GitHub mediante `/settings` después de autenticar. Estas variables son identificadores y URLs **públicos**, no credenciales. Se incluyen en el HTML para que el cliente oficial ejecute PKCE. Copiarlas literalmente de la configuración generada: no adivinar UUID, rutas o secretos. No inventar valores para los campos opcionales ausentes. `.env.example` no contiene secretos. No existe ninguna variable `PUBLIC_*` para credenciales de administración.

4. En Cloudflare Workers & Pages, usar un proyecto **Pages con integración Git**, repositorio anterior, producción `main`, raíz del repositorio, comando `npm run build`, salida `dist`, Node 22.12 o superior. Mantener activados los builds automáticos de producción y comprobar que los filtros de rutas de build incluyen `src/data/products.json`. El token anterior no se configura aquí. Volver a desplegar tras agregar las variables públicas. No crear un deploy hook público ni un comando Workers.
5. En el Site de DecapBridge → **Manage collaborators**, invitar exclusivamente el correo del dueño. El dueño acepta la invitación y elige el método de acceso del proveedor. No necesita el PAT, una cuenta GitHub ni acceso al panel técnico de Cloudflare. Para revocar acceso, quitar al colaborador del Site y verificar que el gateway rechaza la sesión; revisar con el proveedor la duración de tokens ya emitidos. Solo invitar más cuentas cuando se autoricen expresamente; esta versión no agrega roles propios.
6. Comprobar origen y URL de retorno PKCE en el dominio definitivo. Autorizar un origen local o de pruebas solo si hace falta probarlo y el proveedor lo admite. Un dominio preview de Pages distinto no queda autorizado automáticamente. Las variables usadas por las pruebas locales son endpoints de prueba no operativos y no conceden acceso a ningún servicio.
7. Completar la verificación real descrita más abajo, incluida escritura sin sesión, cuenta no invitada, logout, conflictos y publicación de extremo a extremo. Si el gateway no permite `GET/PUT /contents/src/data/products.json`, corregir la configuración o consultar al proveedor; no añadir un PAT público ni un backend sin autenticación como alternativa.

### Uso para el dueño

1. Abrir `/admin/`, pulsar **Iniciar sesión** y completar el acceso de DecapBridge. Entrar en **Carta → Administrar productos**. El menú de usuario del gestor permite **Cerrar sesión**.
2. Buscar por nombre o filtrar categoría y estado. La lista muestra nombre, categoría, grupo, precio CLP y estado. **Crear producto** añade al final un producto con ID aleatorio estable, sin imagen. Completar nombre, descripción, categoría y grupo; al cambiar categoría, el grupo se vacía y debe elegirse uno de la categoría nueva.
3. En **Editar**, modificar datos. Nombre obligatorio, hasta 120 caracteres; descripción hasta 1000; precio entero entre 0 y 1.000.000.000 CLP. La casilla **Precio por confirmar** guarda `null`. Desmarcarla exige introducir un precio explícito; nunca convierte el pendiente a cero. ID, notas e imágenes no se editan. Las validaciones también impiden categorías, grupos o estados desconocidos e IDs duplicados.
4. Elegir **Disponible** para mostrar y permitir añadir; **Agotado** para mostrar con etiqueta y bloquear el pedido; **Oculto** para retirar de carta y selector. Los grupos y categorías sin productos visibles no generan navegación vacía. Si se oculta toda la carta, aparece un aviso y el pedido permite consultar al local sin añadir productos.
5. **Eliminar** abre una confirmación con el nombre, **Cancelar** y **Eliminar**. Sugiere ocultar cuando el retiro sea temporal. Solo quita ese producto del JSON al guardar. La confirmación no elimina imágenes ni el archivo de la carta.
6. Los cambios de campos se incorporan al formulario del gestor y aparecen como **Cambios sin guardar**. **Volver al listado** conserva esos cambios; para descartarlos, usar el regreso/cancelación del gestor y su aviso. El navegador advierte al cerrar una página con cambios, cuando permite `beforeunload`. No cerrar ni recargar si se desea conservar un formulario que aún no se guardó.
7. Abrir el menú **Guardar y solicitar publicación** y elegir su acción del mismo nombre; aceptar la confirmación del gestor si aparece. Se bloquea la edición durante la escritura y Decap bloquea envíos repetidos. Un error conserva el formulario. Ante un conflicto, copiar los cambios necesarios, volver a abrir la carta desde Git y aplicarlos a la versión actual; no insistir con un documento obsoleto. Si se perdió la respuesta de red, comprobar en una nueva apertura si el cambio ya quedó guardado antes de repetirlo.

### Guardado y publicación

- **Sin guardar**: solo existe en el formulario, no está en Git ni en la web.
- **Guardando en el repositorio**: solicitud autenticada en curso; no abandonar la página.
- **Guardado en Git / publicación solicitada**: GitHub aceptó el commit en `main`. Con la integración configurada, Cloudflare encola el build. Esto todavía **no significa publicado**. Se adaptaron los textos de Decap para no llamar «publicado» a un simple commit.
- **Disponible en la web**: el panel compara el SHA-256 de la carta guardada con `/menu-version.json`, generado por el mismo build que la carta. Solo confirma esa versión cuando coinciden. Consulta cada 5 segundos durante hasta 5 minutos mientras el panel permanece abierto. No consulta un estado privado de Cloudflare ni inventa estados como «compilando». Si no coincide o falla la consulta, conserva «aún no confirmado» y pide revisión técnica. No hace falta volver a guardar para esperar la publicación.

El hash público no contiene productos ocultos ni credenciales. La comprobación confirma la versión servida por ese origen, no una garantía de que todos los navegadores abiertos hayan recargado. Abrir la carta de nuevo para obtener el último HTML. Si se hacen cambios nuevos durante la espera, no se anuncia que esos cambios sin guardar ya estén publicados.

**Tiempo de publicación observado: no medido**, porque no se configuraron credenciales ni se realizó un despliegue real. Debe medirse desde la confirmación del guardado hasta la coincidencia del hash en el dominio de producción y registrarse aquí. Puede haber cola, instalación, compilación y propagación; no se promete una demora concreta. Para marcar agotados, tener en cuenta ese intervalo y las visitas que ya tienen abierta una versión anterior: el local confirma disponibilidad por WhatsApp. No es inventario en tiempo real.

Un guardado fallido no sustituye el repositorio; si la respuesta se pierde después de aceptar GitHub, hay que verificarlo antes de reintentar. Un build inválido termina con error y Cloudflare conserva el último despliegue correcto. No desactivar `validate:menu` para sortear errores. Un commit correcto pero semánticamente equivocado puede publicarse y requiere corregirse o recuperarse.

### Recuperación técnica

Para corregir datos válidos, preferir el panel y otro guardado. Para recuperar una eliminación o una versión anterior desde Git:

```sh
git pull --ff-only
git log --oneline -- src/data/products.json
git restore --source=COMMIT_CORRECTO -- src/data/products.json
npm run validate:menu
npm test
npm run check
npm run build
git add src/data/products.json
git commit -m "Recuperar carta anterior"
git push origin main
```

Revisar el diff antes de guardar la recuperación; restaurar el JSON recupera también sus notas, imágenes referenciadas y orden. No reescribir la historia ni usar force push. El nuevo commit dispara otra publicación. Para una urgencia de hosting, Cloudflare permite [volver a un despliegue previo](https://developers.cloudflare.com/pages/configuration/rollbacks/); después alinear Git con la versión deseada para evitar que un futuro build reintroduzca el problema. Cerrar o volver a abrir sesiones que mantengan formularios antiguos para que detecten o eviten conflictos.

Si el PAT expira o se revoca, reemplazarlo solo en DecapBridge. Si falla login, verificar el origen, el retorno PKCE y que el correo fue invitado al Site correcto. Si falla publicación, revisar el log del build de Cloudflare y ejecutar localmente `npm run validate:menu` y `npm run build`. Las funciones de autenticación están en el proveedor, no en este repositorio.

### Migración y alcance

Se migraron **63 productos** conservando IDs, orden, textos, precios, **9 valores `null`**, **3 notas** y **5 referencias a imágenes**. Todos quedaron inicialmente `disponible`. No se corrigieron por suposición los precios de ejemplo ni los textos históricos pendientes de confirmación. Las notas antiguas permanecen aunque el precio se edite: si hay que corregir esas notas, debe hacerlo el responsable técnico, porque su edición está fuera del alcance del panel.

Las promociones (`Promos.astro`) y novedades (`Novedades.astro`) tienen contenido independiente y no se actualizan al cambiar, ocultar o eliminar un producto. La carta original permanece enlazada como **referencia histórica**, con aviso de que sus precios pueden estar desactualizados. El precio vigente es el de la carta administrada. El pedido prepara un mensaje de WhatsApp con nombres, descripciones, cantidades y subtotales; no hay pago ni confirmación automática.

Se excluyen carga de fotos, edición de categorías, promociones, novedades y edición general de la web; bases de datos, inventario por cantidades, gestión de pedidos, reservas, pagos, estadísticas, roles propios, QR y diseño imprimible.

### Desarrollo y verificación de administración

```sh
npm ci
npm run dev
npm run validate:menu
npm test
npm run check
npm run build
npm run test:ui
```

Node 22.12 o superior. Para trabajar con la carta conectada desde desarrollo, usar las variables públicas de `.env.example`, un Site de pruebas y su rama/repositorio permitido; no conectar sesiones de pruebas al repositorio productivo por accidente. Sin variables, el aviso de configuración es el comportamiento esperado.

`npm run test:ui` usa Edge instalado, sin ventana, capturas, vídeos ni comprobaciones visuales; usa un puerto propio (4378). Puede cambiarse `channel` en `playwright.config.ts` si el equipo usa otro navegador instalado. Las pruebas del campo usan un adaptador del runtime y datos de prueba en memoria **solo dentro de `tests/`**: no se incluye en el build. La persistencia se prueba con un gateway de prueba que emula respuestas de la API. Esto prueba el contrato local, no acredita autorización externa.

La prueba de carga del CMS real necesita el bundle fijado en la caché local (si falta, se marca omitida):

```powershell
Invoke-WebRequest https://cdn.jsdelivr.net/npm/decap-cms@3.17.3/dist/decap-cms.js -OutFile .npm-cache/decap-cms-3.17.3.js
```

El archivo está ignorado y la prueba conserva el SRI del HTML real. Las demás pruebas no necesitan ese bundle. No se usan credenciales reales en las pruebas.

Verificado localmente: compilación estática, TypeScript/Astro; reglas de precio y relaciones; disponibilidad y mensaje incluso ante cantidades manipuladas; creación/edición/eliminación y conservación de metadatos; persistencia y reapertura sobre API de prueba; rechazo 401 y conflictos SHA sobre API de prueba; error de red, reintento y doble guardado. Las pruebas de navegador cubren CRUD, filtros, categoría/grupo, estados, errores y pedido a 1280 y 390 px por interacción DOM. También comprueban la carga del CMS real con sesión requerida, su formulario nativo con gateway de prueba, la reapertura del documento guardado, la confirmación por hash y la conservación de cambios nuevos sin guardar. La prueba pública compara carta y selector con el JSON y verifica el subtotal con precios pendientes. Se bloquean integraciones externas en esa prueba pública.

Resultado local: `npm test`, **14 pruebas aprobadas**; `npm run test:ui`, **8 pruebas aprobadas, ninguna omitida**, con Edge sin ventana; `npm run check`, **0 errores, 0 advertencias**; `npm run build`, **salida estática correcta**. El login/logout del backend de prueba no acredita la autorización ni la revocación de DecapBridge en producción. No se hicieron capturas ni comprobaciones visuales en esta implementación. La migración se contrastó campo por campo y en orden contra `src/data/menu.ts` de HEAD, sin diferencias salvo el estado inicial añadido.

Mantenimiento pendiente detectado por `npm audit --omit=dev`: el árbol existente de Astro 5 reporta **5 avisos (1 crítico, 3 altos y 1 bajo)**. npm propone una actualización mayor de Astro para resolver el conjunto; no se ejecutó `audit fix --force` ni se cambió de versión mayor dentro de esta integración. Revisar esos avisos y planificar esa migración por separado; por ejemplo, el [aviso de optimización AVIF](https://github.com/advisories/GHSA-26w7-cxv4-gfx2). No se certificó que todos los avisos resulten explotables o inaplicables a esta salida estática.

**Pendiente en servicios reales antes de la entrega operativa:** conectar PAT/Site/invitación y variables; probar login/logout y retorno PKCE; confirmar 401/403 en lectura y escritura sin sesión, con token inválido y con cuenta no invitada; verificar revocación; ejecutar CRUD con un producto temporal y reabrir el panel desde otra sesión; abrir dos sesiones y comprobar que la segunda escritura de una versión antigua recibe conflicto; inducir un fallo de red y conservar formulario; verificar que el commit dispara Pages; observar hash, carta y mensaje tras publicar nombres, descripciones, precios, estados y eliminación; medir demora; comprobar un build rechazado en un proyecto de pruebas y conservación del último sitio correcto. Repetir acceso y publicación en un teléfono real si se necesita certificar ese dispositivo. No se afirma haber probado autenticación ni publicación en producción.

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

Landing demo de una sola página, con Astro, Tailwind CSS y una única isla React para armar el pedido por WhatsApp. Sitio estático, con salida estática y administración Git mediante Decap CMS y DecapBridge.

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

- `src/data/products.json`: única fuente editable de productos, descripciones, precios, estados, notas y referencias a imágenes. Se administra desde `/admin/`. `src/data/menu-config.ts` mantiene las categorías y grupos fijos; `menu.ts` resuelve las imágenes de Astro. Los precios conocidos son enteros en CLP; el formateo usa `es-CL`. Un precio `null` se muestra como «Por confirmar».
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

1. Confirmar desde `/admin/` los precios que están como `null` y el nombre incompleto. No completar los dígitos por suposición.
2. Confirmar con el local la vigencia de la información transcrita en `src/data/business.ts`.
3. Completar `whatsappNumber` con el teléfono real en formato `56912345678` (solo dígitos) y actualizar `whatsappDisplay`.
4. Copiar `.env.example` a `.env` y definir `PUBLIC_SITE_URL` con el dominio real para generar canonical y URLs absolutas de Open Graph. Volver a compilar.

El botón «Ver mapa interactivo» permite alternar entre la vista oscura y el mapa de Google dentro del mismo panel. El iframe solo recibe su URL y se carga cuando la persona activa esa opción; sus colores y controles originales se conservan. Los botones se sitúan fuera del mapa, sin tapar sus controles o atribuciones. Sin JavaScript, la vista ilustrativa y el enlace «Cómo llegar» siguen disponibles. El mapa usa la dirección informada en `business.ts` y no necesita una API key.

Hasta configurar un WhatsApp chileno válido, los botones permiten explorar el pedido, pero su envío queda deshabilitado con un aviso de demo. Con el número configurado, el botón flotante abre WhatsApp con un mensaje prellenado; el pedido envía cantidades, subtotales, total referencial y comentarios. El mensaje **se prepara**: la persona lo envía desde WhatsApp. No hay pago ni confirmación automática.

Se pueden incluir productos con precio pendiente en la consulta. Si los hay, el resumen muestra un **subtotal conocido**, excluye esos valores del cálculo y solicita confirmación del total final. Si todos los precios del pedido están pendientes, muestra «Por confirmar» en lugar de un total de cero.

## Arquitectura

- Astro genera todo el contenido estático. La carta sigue visible incluso sin JavaScript.
- Las pestañas accesibles y el menú móvil usan JavaScript nativo, sin React.
- `src/components/WhatsAppOrder.tsx` es la isla React pública, hidratada con `client:load`. El gestor usa su propio runtime y solo se carga en `/admin/`.
- El pedido usa un `dialog` nativo con manejo de foco, cierre con Escape y bloqueo de scroll del fondo. Los datos viven solo en memoria durante la visita.
- Google Fonts sirve Dancing Script únicamente para títulos y DM Sans para el resto. El mapa embebido y la consulta opcional de reseñas son las otras integraciones externas. Las fotos del local son archivos locales; los avatares de reseñas actualizadas se sirven desde Google.

## Verificación

Ejecutar `npm run check`, `npm test`, `npm run build` y `npm run test:ui`. Las pruebas de administración comprueban comportamiento mediante DOM, sin capturas ni verificaciones visuales. Para comprobar los datos actualizados se necesitan una clave válida, las APIs habilitadas y el origen de la vista previa autorizado.

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
