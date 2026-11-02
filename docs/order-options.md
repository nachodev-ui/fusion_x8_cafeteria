# Elecciones antes de agregar al pedido

El botón «+» de un producto con `options` abre una selección; la cesta no cambia hasta confirmar. No se preselecciona ninguna respuesta. Cancelar o cerrar con Escape descarta solamente esa selección pendiente. Los productos sin opciones se agregan como antes.

Las opciones viven en `src/data/products.json` junto al producto, se validan en el servidor y se editan en **Administración → Editar producto → Sabores y preferencias**. Cada elección tiene un nombre y una lista de respuestas o un campo de preferencia escrita. Todas son obligatorias y no modifican el precio. Se conservan hasta 8 elecciones por producto y 30 respuestas por lista.

Se configuraron 22 productos a partir de la carta existente: jugos, limonadas, syrup, frappuccino, milkshake, copas con sabores a elección, barquillos, banana split, waffle, fondue, galletones y productos que indican consultar variedades. Los sabores de helado, toppings y variedades no enumeradas se escriben como preferencias sujetas a disponibilidad, según lo acordado con el usuario. No se inventó una lista de sabores ni se cambiaron precios o descripciones.

Cada combinación es una línea independiente del pedido. Repetir la misma elección suma su cantidad; pedir otro sabor crea otra línea. «Cambiar opciones» permite editar una línea y conserva su cantidad. Las elecciones se incluyen junto al nombre y precio unitario en el mensaje de WhatsApp. No se envía ningún mensaje automáticamente.

## Referencias de 21st Dev

- [Choicebox de Halaska](https://21st.dev/@halaska-studio/components/choicebox/with-meta): tarjetas seleccionables, indicador de selección y borde destacado. Se revisó su imagen de referencia y su uso público.
- [Radio Group con grid de Origin UI](https://21st.dev/@originui/components/radio-group/with-grid): distribución de opciones en dos columnas y selección única con teclado.
- [Credenza de redpangilinan](https://news.21st.dev/@redpangilinan/components/credenza): patrón de diálogo centrado en escritorio y panel desde abajo en móvil.

Implementación propia con React, controles nativos y `<dialog>`, conservando DM Sans, los tonos cálidos y el rojo de Fusión X8. Sin instalar shadcn, Radix, Vaul ni otras dependencias. El fondo queda inerte al abrir el diálogo y el foco vuelve al control de apertura al cerrar. El pie de confirmación permanece visible mientras se recorren las elecciones.
