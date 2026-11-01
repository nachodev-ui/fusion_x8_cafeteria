# Navegación y jerarquía de la carta

La carta de QR deja de mostrar todas las categorías en una sola columna. La primera vista enseña una categoría y su primer grupo (actualmente 13 cafés frente a los 64 productos de la carta). Las demás preparaciones siguen accesibles en las categorías y los grupos de la parte superior. «Ver todo» despliega la categoría elegida. El buscador siempre consulta la carta completa, admite varios términos y no distingue tildes ni mayúsculas.

## Referencias consultadas en 21st.dev

- [Tabs, Sean Hello / ReUI](https://21st.dev/@sean0205/components/tabs/line): navegación compacta por una vista a la vez y una selección visible.
- [The Input, felipemenezes098](https://21st.dev/@felipemenezes098/components/the-input/with-search-button): campo de búsqueda integrado con icono y acción.
- [Search With Category, Ruixen, vista previa](https://cdn.21st.dev/ruixen.ui/search-with-category/default/bundle.1756181628618.html?theme=light): relación entre búsqueda y categorías.

Se usaron como referencias de interacción y composición. La implementación es propia, con Astro, CSS y JavaScript del proyecto; no se instalaron componentes de pago, React ni animaciones adicionales en la carta pública.

## Diseño

En `/carta`, el fondo crema y las superficies claras separan las filas de producto. La categoría tiene el mayor peso tipográfico; los grupos usan el rojo de marca y los nombres de producto y precios comparten una línea de lectura. Las descripciones y las notas usan un nivel secundario. En escritorio hay dos columnas de productos; en móvil, una.

Los controles de categoría, búsqueda y grupo quedan pegajosos en `/carta`. Al filtrar se vuelve al inicio de esos controles y se mantiene `?mesa=N`. Los grupos pequeños conservan una altura de lectura estable para que la cabecera del sitio no reaparezca al cambiar a una lista corta. Los enlaces `#categoria` y `#grupo` permiten volver a la selección al recargar. La portada comparte el mismo navegador de carta sobre su tema oscuro, preservando el pedido existente.

Sin JavaScript siguen disponibles todos los productos y los enlaces a categorías. Los controles que requieren JavaScript permanecen ocultos. La versión impresa desde el navegador incluye todos los productos, aun cuando la vista interactiva esté filtrada.

Se retiraron del contenido visible y de los errores de formulario las aclaraciones de moneda. El formateo interno sigue usando pesos chilenos y separadores locales. Se retiró el enlace «Actualizar carta». Las cabeceras de revalidación y la recarga de una página restaurada desde bfcache mantienen su comportamiento.

## Volver al inicio

`BackToTop.astro` se usa en `/carta`, la portada y `/admin/`. Aparece después de bajar al menos 560 px o tres cuartos de una pantalla desde el punto de inicio. En la carta vuelve a las categorías, conservando grupo, búsqueda y mesa; en la portada vuelve al inicio del sitio y en admin al panel. Respeta movimiento reducido, mantiene un nombre accesible y evita el área del pie de edición. En la portada se coloca a la izquierda para convivir con el pedido y WhatsApp.

## Verificación

Pruebas de normalización de búsqueda, filtros, navegación por teclado, búsqueda entre categorías, consultas sin resultados, conservación de mesa, recarga de selección, disponibilidad, precios, uso sin JavaScript y vuelta al inicio. Se conservan los controles de compilación, tipos y presupuesto de carga. Las pruebas de navegador usan DOM y medidas de los elementos, sin capturas ni comprobaciones visuales.

Resultados: 19 pruebas de datos/API/QR/PDF/búsqueda y 19 casos de navegador aprobados; además, 12 accesos verificados con Chromium y WebKit en perfiles móviles, recursos tardíos y cabecera fija. El botón se probó en carta, portada y admin. La carga inicial estimada se mantiene por debajo de 92 KB. La disponibilidad real, precios y pedidos continúan leyendo la misma fuente.

La ruta pública del QR y el contenido de los QR impresos no cambian. El panel conserva la API, la autenticación y la fuente de datos existentes.
