# Fusión x8

## Carta permanente por QR

La página `/carta` comparte `src/data/products.json` con la portada y el panel. Abre directamente con las categorías a la vista, mide cabeceras fijas y ajusta cargas tardías. Conserva agotados, etiquetas y revalidación del HTML. `npm run generate:proposals` prepara dos diseños de Mesa 1 con QR de 58 mm y sin URL visible; `npm run generate:qr -- --diseno a --mesas N` permite producir la tirada del diseño elegido. Instrucciones, vistas previas, límites de las pruebas y checklist en [docs/carta-qr-propuestas.md](docs/carta-qr-propuestas.md).

La carta y la portada comparten navegación por categorías y grupos, búsqueda global y un botón para volver al inicio; el panel también incorpora ese botón. Referencias de 21st.dev y decisiones de jerarquía en [docs/carta-navigation-design.md](docs/carta-navigation-design.md).

## Panel propio de administración

El panel está en **/admin/**, dentro del mismo proyecto Astro. Usa React y el diseño de Fusión x8, con una API en **Pages Functions**. La carta pública sigue siendo estática. No requiere otro repositorio, base de datos ni cuenta de GitHub para el dueño.

**La implementación está preparada; falta configurar Cloudflare Access y los secretos de producción y verificar el circuito real.** Sin configuración o sesión válida, la API rechaza las operaciones. No hay autenticación simulada ni registro público de administradores.

### Arquitectura

- Los productos persisten únicamente en **src/data/products.json**. El panel consulta ese archivo mediante la API privada; cada guardado modifica un solo producto y crea un commit en main. La integración Git de Pages inicia la publicación.
- **src/components/AdminPanel.tsx** contiene listado, filtros, paginación, formulario y confirmaciones. Solo carga en /admin/. Los productos no se incluyen en su HTML ni en su JavaScript.
- **functions/api/admin/[[path]].ts** conecta Pages con **src/server/admin-api.ts**. La función valida la firma RS256 del JWT de Access mediante jose, emisor, audiencia, expiración y un único correo permitido. No confía en un correo enviado por el navegador.
- Cloudflare Access gestiona el inicio de sesión por código enviado al correo autorizado. El cierre usa su endpoint oficial. No se guardan contraseñas propias.
- El token de GitHub permanece exclusivamente en el entorno del servidor. El navegador nunca llama a GitHub con ese token. La API limita todas las operaciones al archivo de productos y comprueba origen, tamaño, esquema y revisión SHA antes de escribir.
- La validación compartida protege tanto el formulario como la API y el build. La escritura usa la revisión SHA de GitHub: una sesión antigua o una carrera devuelve conflicto, sin sobrescritura silenciosa.
- Categorías, grupos y validación permanecen en **src/data/menu-config.ts** y **menu-schema.ts**; las imágenes existentes se resuelven con Astro en **menu.ts**. No hay carga de fotos ni administración de categorías.
- **public/_routes.json** invoca funciones solamente para /api/admin/*. La carta y sus recursos siguen sirviéndose como archivos estáticos. No se necesita adaptador SSR.
- El HTML base del panel no contiene el documento privado. La indexación se bloquea como medida complementaria. El repositorio actual es público: sus archivos e historial pueden consultarse directamente en GitHub. Para que también sean privados allí, el responsable debe cambiar la visibilidad del repositorio y comprobar la integración de Pages.

Documentación oficial consultada el 31/10/2026: [Pages Functions](https://developers.cloudflare.com/pages/functions/get-started/), [validar JWT de Access](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), [login por código](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/), [Contents API de GitHub](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents).

### Configuración paso a paso en producción

#### 1. Confirmar el proyecto Pages

En Cloudflare → **Workers & Pages** → proyecto **fusion-x8-cafeteria**:

1. Mantener la integración con **nachodev-ui/fusion_x8_cafeteria**, rama de producción **main**.
2. Directorio raíz: raíz del repositorio; comando **npm run build**; salida **dist**; Node 22.12 o superior.
3. Conservar **functions/** en la raíz. Pages lo empaqueta automáticamente durante el despliegue Git. No subir dist mediante arrastrar archivos: eso no implementa estas funciones.
4. Si hay filtros de rutas para disparar builds, incluir src/data/products.json. No excluir los commits creados por el panel.

#### 2. Preparar el acceso con pages.dev

No hace falta comprar un dominio. Cloudflare documenta un procedimiento especial para [proteger el dominio de producción pages.dev](https://developers.cloudflare.com/pages/platform/known-issues/#enable-access-on-your-pagesdev-domain).

1. Abrir **Cloudflare Zero Trust / Cloudflare One** y completar el alta del equipo con el plan gratuito. Anotar el dominio de equipo, de la forma **mi-equipo.cloudflareaccess.com**.
2. En **Integrations → Identity providers**, habilitar **One-time PIN**. Los nombres de las secciones pueden aparecer como **Settings → Authentication → Login methods** según la versión de la consola.
3. En Workers & Pages → fusion-x8-cafeteria → **Settings**, activar **Enable access policy** y pulsar **Manage** en la política generada para las vistas previas.
4. En la aplicación creada, abrir **Configure**. En **Public hostname**, quitar el asterisco del subdominio para apuntar a **fusion-x8-cafeteria.pages.dev**. Cambiar el nombre a **Fusión x8 administración** si la consola lo exige.
5. **Antes de guardar**, limitar esa aplicación a estas rutas, añadiendo public hostnames dentro de la MISMA aplicación:

| Hostname | Path |
| --- | --- |
| fusion-x8-cafeteria.pages.dev | /admin |
| fusion-x8-cafeteria.pages.dev | /admin/* |
| fusion-x8-cafeteria.pages.dev | /api/admin/* |

6. No dejar una entrada de producción sin Path: protegería también la carta pública. Las tres entradas deben compartir la misma aplicación y su **Application Audience (AUD)**.
7. Reemplazar la política de acceso generada por una única política **Allow → Include → Emails → nacho.rtk@gmail.com**. Ese es el único correo autorizado para las pruebas actuales. No usar Everyone, un dominio completo de correo, Bypass ni Service Auth. Seleccionar One-time PIN como método de acceso y una duración de sesión razonable, por ejemplo 8 horas.
8. Guardar y copiar el **Application Audience (AUD) Tag** desde los detalles de esa aplicación. Es un identificador de configuración; no es el token de escritura de GitHub.
9. Volver a Pages y reactivar **Enable access policy** para recrear la protección de vistas previas si se quitó al trasladar la aplicación. Mantenerlas privadas. La API además rechaza otros hosts mediante ADMIN_ORIGIN, aunque alguien intente usar un alias de despliegue.
10. Comprobar en incógnito que la raíz pública abre sin login y /admin/ exige identificación. Comprobar también /admin y /api/admin/products. Si la consola no permite guardar la combinación de host y rutas, detener esta configuración y revisar el procedimiento enlazado; no abrir una política Everyone para resolverlo.

Reglas de coincidencia: [rutas de aplicaciones de Access](https://developers.cloudflare.com/cloudflare-one/access-controls/policies/app-paths/). Para cambiar al correo del dueño, sustituir el correo tanto en esta política como en ADMIN_EMAIL, revocar las sesiones anteriores y volver a desplegar; no basta con cambiar el texto de la interfaz.

#### 3. Crear la credencial limitada de GitHub

Esta credencial la prepara el responsable técnico; el dueño no necesita entrar a GitHub.

1. GitHub → foto de perfil → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. Nombre: **Fusión x8 panel**; elegir responsable y vencimiento. En **Resource owner**, elegir la cuenta propietaria.
3. **Repository access → Only select repositories → fusion_x8_cafeteria**.
4. **Repository permissions → Contents → Read and write**. Metadata mantiene lectura implícita. No hace falta permiso Pull requests, porque no hay flujo editorial.
5. Generar y copiar el valor directamente al secreto GITHUB_TOKEN de Cloudflare. Si la organización exige aprobación, obtenerla. Registrar responsable y rotarlo antes del vencimiento.
6. Comprobar las reglas de protección de main: deben permitir este commit directo de la identidad técnica. No desactivar controles globales por suposición.

Referencia: [crear un fine-grained PAT](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-fine-grained-personal-access-token).

#### 4. Configurar Variables and Secrets en Pages

En el proyecto Pages → **Settings → Variables and Secrets**, entorno **Production**, añadir:

| Nombre | Valor |
| --- | --- |
| ADMIN_ORIGIN | https://fusion-x8-cafeteria.pages.dev |
| ADMIN_EMAIL | nacho.rtk@gmail.com |
| ACCESS_TEAM_DOMAIN | dominio real del equipo, sin https:// ni barra final |
| ACCESS_AUD | Audience Tag de la aplicación que protege panel y API |
| GITHUB_REPOSITORY | nachodev-ui/fusion_x8_cafeteria |
| GITHUB_BRANCH | main |
| GITHUB_TOKEN | PAT real, guardado como **Secret**, nunca texto público |
| PUBLIC_SITE_URL | https://fusion-x8-cafeteria.pages.dev |

No usar prefijos PUBLIC_ para las variables del administrador. No pegar el PAT en Git, capturas, chat ni JavaScript. El archivo .env local no configura el runtime de producción. Eliminar de la consola las variables y secretos de la integración anterior, que este código ya no utiliza. Revocar también su credencial antigua cuando la nueva esté funcionando.

Volver a desplegar desde Pages después de cambiar las variables. No copiar secretos de producción a Preview; usar un proyecto, rama y credencial independientes si se necesita una integración de pruebas.

#### 5. Primera comprobación real

1. Abrir la carta sin sesión: debe seguir abierta.
2. Abrir /admin/, introducir el correo autorizado y usar el código recibido. No se crea una contraseña ni una cuenta pública.
3. Crear un producto temporal, guardar, cerrar y reabrir: debe persistir. Revisar el commit de main y el despliegue de Pages.
4. Esperar a que el panel confirme la versión publicada y comprobar nombre, descripción, precio y grupo en la carta y el pedido.
5. Probar Agotado y Oculto, precio por confirmar, edición y eliminación del producto temporal.
6. Abrir dos sesiones con la misma versión, guardar desde una y luego desde la otra: debe aparecer conflicto.
7. Cerrar sesión y probar lectura/escritura sin sesión y con otra cuenta. La política debe denegarla; un acceso directo a la API nunca debe aceptar escrituras.
8. Comprobar el ciclo desde celular real y anotar la demora de publicación.

### Uso diario

Crear y editar abre una vista dedicada con secciones y una vista previa del producto. El listado y sus filtros se conservan al volver. El pie mantiene accesibles **Cancelar** y **Guardar producto**; la disponibilidad se elige con tarjetas. Referencias y decisiones en [docs/admin-editor-design.md](docs/admin-editor-design.md).

1. En **/admin/**, iniciar sesión con el correo autorizado. **Cerrar sesión** usa el cierre de Cloudflare Access.
2. Buscar por nombre o filtrar categoría y estado. La lista está paginada para mantener ligera la edición.
3. **Crear producto** añade al final un identificador UUID estable y un formulario sin imagen. En **Editar**, el ID no cambia. Al cambiar categoría, elegir de nuevo un grupo válido.
4. Nombre obligatorio hasta 120 caracteres; descripción hasta 1000; precio entero entre 0 y 1.000.000.000 CLP. **Precio por confirmar** almacena null; desmarcar exige un precio explícito y nunca lo transforma en cero.
   En **Sabores y preferencias**, añade listas de variedades o campos de preferencia escrita. El cliente debe completarlos antes de agregar el producto; cada combinación se conserva por separado en la cesta y en WhatsApp. Las opciones no cambian el precio. Consulta [el funcionamiento y las referencias de diseño](docs/order-options.md).
5. **Disponible**: visible y admite pedidos. **Agotado**: visible con etiqueta, sin pedidos. **Oculto**: fuera de carta y selector. El selector rápido de estado abre el formulario: también requiere **Guardar producto**.
6. **Eliminar** muestra el nombre y permite Cancelar o Eliminar. Sugiere Oculto para retiradas temporales. Elimina solo ese producto; no elimina imágenes.
7. **Guardar producto** valida y guarda inmediatamente ese producto en Git. Cada guardado o eliminación solicita otro despliegue. No hay un segundo botón para publicar ni borradores.
8. Se bloquean envíos duplicados mientras se guarda. Un error conserva el formulario. Si se pierde la respuesta, comprobar **Cargar versión actual** antes de repetir; una creación repetida con el mismo ID no duplica el producto. Si otro editor cambió la carta, cargar la versión actual, comparar el dato del repositorio y revisar el formulario conservado antes de guardar otra vez.
9. El panel avisa antes de descartar cambios al cambiar de producto o cerrar sesión. El navegador puede avisar al cerrar/recargar; no se conserva un borrador después de abandonar la página. Si vence la sesión, el enlace de acceso abre otra pestaña para conservar el formulario.

Las confirmaciones de descarte y eliminación usan un diálogo propio. El logo vuelve al listado conservando la protección de cambios pendientes. Cerrar sesión tras confirmar un descarte no dispara una segunda alerta nativa. Al recargar, cerrar la pestaña o salir con controles del navegador, el aviso nativo permanece: su texto y diseño dependen del navegador.

Los avisos flotantes muestran guardado en curso, espera de publicación, publicación verificada y errores. El loader de publicación indica espera, no un porcentaje ni el estado interno de Cloudflare. Éxitos y avisos informativos se cierran tras 9 segundos; errores y espera quedan hasta cerrarlos o cambiar de estado. El estado permanente sigue visible al cerrar un toast. Si no se confirma, se puede volver a comprobar sin guardar de nuevo. Publicar el último guardado nunca confirma cambios nuevos sin guardar.

### Guardado, publicación y límites

- **Cambios sin guardar**: solo en memoria del formulario.
- **Guardando**: petición al servidor; controles bloqueados.
- **Guardado en el repositorio**: GitHub aceptó el commit. Todavía no confirma que la web haya cambiado.
- **Esperando confirmar la publicación**: el panel compara la firma de la carta guardada con /menu-version.json cada 5 segundos durante hasta 5 minutos.
- **Disponible en la web; versión verificada**: solo se muestra al coincidir la firma del último guardado con la servida por ese dominio. No se inventan estados privados del build ni se anuncian los cambios nuevos sin guardar como publicados.
- **Sin confirmar**: revisar el despliegue; no hace falta volver a guardar para iniciar otro build.

La firma pública no revela productos ocultos ni secretos. Confirma el contenido servido por ese origen, no que otras pestañas antiguas se hayan recargado. **Tiempo real de publicación: aún no medido.** Hay demora por cola, instalación, compilación y propagación. Un agotado no se refleja instantáneamente ni modifica cartas ya abiertas; la disponibilidad final se confirma con el local por WhatsApp.

Un fallo de validación no escribe en Git. Si se pierde la respuesta después de aceptar GitHub, el resultado puede haberse guardado: comprobarlo antes de reintentar. Un build fallido mantiene el último despliegue correcto de Pages. No desactivar la validación para forzar una publicación.

Planes revisados el 31/10/2026: [Access tiene un plan gratuito](https://www.cloudflare.com/plans/zero-trust-services/); confirmar su cupo vigente al activar el equipo. Las [Functions gratuitas](https://developers.cloudflare.com/pages/functions/pricing/) comparten 100.000 peticiones diarias con Workers; la carta estática no consume esas invocaciones. [Pages Free](https://developers.cloudflare.com/pages/platform/limits/) permite 500 builds al mes y uno simultáneo por cuenta. Cada guardado consume un build y GitHub también aplica límites API. La solución puede operar sin cuota mensual dentro de los planes gratuitos, sin garantía de gratuidad futura; revisar el plan elegido y sus límites antes de aceptar cargos. No se necesita dominio propio ni un servicio de correo contratado por el proyecto.

### Desarrollo local

Requiere Node 22.12 o superior:

    npm ci
    npm run dev

El desarrollo de Astro sirve la carta y la interfaz. Sin la API de Pages, el panel muestra un fallo de acceso, que es esperado; no hay un login local ficticio.

Para ejecutar archivos estáticos y funciones con el runtime local:

    Copy-Item .dev.vars.example .dev.vars
    npm run dev:pages

El archivo .dev.vars está ignorado. Para probar solo que falla cerrado no necesita credenciales. El runtime local no genera ni inyecta una sesión de Cloudflare Access. Para probar un login real usar un proyecto HTTPS de pruebas protegido con Access y una rama/repositorio de pruebas, no la credencial de producción. No desactivar la verificación JWT ni copiar una sesión a código.

.env.example conserva la configuración pública de la web y documenta los nombres de runtime sin secretos. .dev.vars.example es la plantilla para Wrangler. Las credenciales reales solo van en .dev.vars local o en los secretos de Cloudflare.

### Recuperación técnica

Para corregir datos válidos, preferir otro guardado desde el panel. Para recuperar un producto eliminado o una carta anterior:

    git pull --ff-only
    git log --oneline -- src/data/products.json
    git restore --source=COMMIT_CORRECTO -- src/data/products.json
    npm run validate:menu
    npm test
    npm run check
    npm run build
    git diff -- src/data/products.json
    git add src/data/products.json
    git commit -m "Recuperar carta anterior"
    git push origin main

Revisar el diff: la recuperación incluye notas, imágenes y orden de esa versión. No reescribir la historia ni hacer force push. Cloudflare también permite [volver al despliegue anterior](https://developers.cloudflare.com/pages/configuration/rollbacks/); después alinear Git para que el siguiente build no reintroduzca el problema.

Si falla el acceso, revisar dominio del equipo, AUD, rutas protegidas y correo en ambas configuraciones. Si la API responde 503, faltan variables; 401, sesión ausente o inválida; 403, correo/origen no autorizado; 409, conflicto; 422, producto inválido; 502, problema con GitHub o respuesta perdida. Rotar el PAT solo en Cloudflare y volver a desplegar. Revisar logs sin imprimir credenciales ni JWT. [El cierre de Access](https://developers.cloudflare.com/cloudflare-one/access-controls/access-settings/session-management/#log-out-as-a-user) limpia la cookie; la revocación de tokens emitidos puede tardar 20–30 segundos.

### Datos conservados y alcance

Se conservan los **63 productos**, IDs, orden, descripciones, **9 precios null**, **3 notas** y **5 referencias a imágenes**. Esta migración del panel no modifica el archivo de productos ni las funciones públicas de disponibilidad y cálculo.

Promociones y novedades son contenido independiente y no cambian al editar productos. Los originales de la carta siguen enlazados como documentos históricos de referencia: sus precios pueden estar desactualizados. La carta administrada contiene los vigentes. El pedido prepara un mensaje de WhatsApp; no cobra ni confirma automáticamente.

Se excluyen fotos nuevas, categorías editables, promociones, novedades, edición general, base de datos, inventario por cantidades, pedidos administrados, reservas, pagos, estadísticas, roles, QR y diseño imprimible.

### Verificaciones

    npm test
    npm run test:ui
    npm run check
    npm run build
    npm run check:functions

Las pruebas de servidor usan firmas JWT reales generadas con claves efímeras de prueba y un repositorio de prueba en memoria. Cubren rechazo de acceso, correo, audiencia y expiración, CSRF, CRUD, null, metadatos protegidos, concurrencia, errores y creación idempotente. Las reglas compartidas cubren disponibilidad, selección y mensaje de pedido ante cantidades manipuladas, categorías vacías y precios inválidos.

Las pruebas de navegador usan Edge sin ventana y respuestas de API controladas exclusivamente dentro de tests. Comprueban CRUD, filtros, estados, categoría/grupo, errores con formulario conservado, conflicto, confirmación de descarte, reapertura, cierre y firma de publicación a 1280 y 390 px. La carta pública se contrasta con el JSON y el pedido. No se hacen capturas ni comprobaciones visuales.

**No equivalen a una prueba en producción.** Pendientes: política real de Access, envío del código, login/logout, rechazo de otras cuentas, revocación, PAT, commit y build reales, publicación y demora observada, conservación del despliegue ante un build fallido y teléfono real. Completar el paso 5 antes de dar el panel como operativo.

Resultado local: **12 pruebas de servidor/reglas y 12 de navegador aprobadas**, TypeScript/Astro sin errores ni advertencias, compilación estática y empaquetado de Pages Functions correctos. En el runtime local de Pages, carta y panel respondieron 200 y la API rechazó lectura y escritura anónimas o con token falso con 401. Las pruebas no usan credenciales de producción. Wrangler local fija la compatibilidad en **2026-10-30**, soportada por el runtime instalado.

Mantenimiento pendiente: npm audit --omit=dev sigue reportando **5 avisos del árbol existente de Astro 5 (1 crítico, 3 altos y 1 bajo)**. La corrección propuesta por npm requiere una actualización mayor de Astro; no se ejecutó una migración de framework ni audit fix --force dentro de este cambio. Revisar los avisos y programar esa actualización. La API nueva usa jose y no ejecuta el servidor SSR de Astro.

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

Landing demo de una sola página, con Astro, Tailwind CSS y una única isla React para armar el pedido por WhatsApp. Sitio público estático con panel React y API privada de Pages Functions en el mismo proyecto.

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
3. Reemplazar el número de pruebas configurado en `whatsappNumber` por el WhatsApp definitivo del local, en formato `56912345678` (solo dígitos), y actualizar `whatsappDisplay`.
4. Copiar `.env.example` a `.env` y definir `PUBLIC_SITE_URL` con el dominio real para generar canonical y URLs absolutas de Open Graph. Volver a compilar.

El botón «Ver mapa interactivo» permite alternar entre la vista oscura y el mapa de Google dentro del mismo panel. El iframe solo recibe su URL y se carga cuando la persona activa esa opción; sus colores y controles originales se conservan. Los botones se sitúan fuera del mapa, sin tapar sus controles o atribuciones. Sin JavaScript, la vista ilustrativa y el enlace «Cómo llegar» siguen disponibles. El mapa usa la dirección informada en `business.ts` y no necesita una API key.

Actualmente se utiliza el número de pruebas indicado por el responsable del proyecto en `src/data/business.ts`. El botón flotante abre WhatsApp con un mensaje prellenado; el pedido incluye cantidades, nombres, precios unitarios (`c/u`), total y comentarios, sin descripciones de productos. El mensaje **se prepara**: la persona lo envía desde WhatsApp. No hay pago ni confirmación automática. Si se elimina el número o se configura uno inválido, el envío queda deshabilitado con un aviso de demo.

Se pueden incluir productos con precio pendiente en la consulta. Si los hay, el resumen muestra un **subtotal conocido**, excluye esos valores del cálculo y solicita confirmación del total final. Si todos los precios del pedido están pendientes, muestra «Por confirmar» en lugar de un total de cero.

## Arquitectura

- Astro genera todo el contenido estático. La carta sigue visible incluso sin JavaScript.
- Las pestañas accesibles y el menú móvil usan JavaScript nativo, sin React.
- `src/components/WhatsAppOrder.tsx` es la isla React pública, hidratada con `client:load`. El panel React solo se carga en /admin/; las funciones privadas viven en /api/admin/.
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
