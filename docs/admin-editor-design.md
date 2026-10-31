# Crear y editar productos

Referencias de 21st.dev consultadas el 31 de octubre de 2026:

- [Form Layout — Ephraim Duncan](https://21st.dev/@ephraimduncan/components/form-layout/form-sections-with-checkbox-settings): secciones con títulos y ayuda contextual.
- [Account Settings Fieldset — Cnippet](https://21st.dev/@cnippet-dev/components/v-fieldset-7): campos relacionados agrupados y jerarquía de etiquetas y acciones.
- [Radio Group Cards — Origin UI](https://21st.dev/@originui/components/radio-group/card): opciones visibles con título, descripción y estado seleccionado.
- [Alert Dialog — f0rextasy](https://21st.dev/@f0rextasy/components/alert-dialog): confirmaciones con jerarquía entre cancelar y descartar/eliminar.
- [Promise Toast — Cnippet](https://21st.dev/@cnippet-dev/components/promise-toast): feedback de una operación asíncrona con estados de espera, éxito y error.

Implementación propia con React, HTML y CSS del proyecto. No se copiaron componentes ni se añadieron bibliotecas. Se conserva la paleta existente.

El editor reemplaza temporalmente el listado en la misma página. Conserva filtros y paginación al volver, enfoca el nombre al abrir y devuelve el foco a la acción original al cerrar. Todos los campos se organizan en Información, Precio, Ubicación en la carta y Disponibilidad.

La vista previa muestra los datos del formulario y la imagen existente, con avisos para ocultos y agotados. Es una referencia del contenido, no una publicación ni una réplica exacta del diseño público. No admite cargar imágenes.

Cancelar y Volver a productos usan la confirmación de descarte existente. El pie mantiene las acciones accesibles al desplazarse. Los errores de campo aparecen tras interactuar con ellos; la validación compartida sigue controlando el guardado. El precio pendiente conserva null y exige introducir un precio explícito al desactivarlo.

Se conservan autorización, API, revisión SHA, conflictos, formulario ante errores y comprobación de publicación. No se modifican productos ni carta pública.

Verificación por DOM, sin capturas ni comprobaciones visuales: CRUD a 1280 y 390 px, vista previa, disponibilidad, precio pendiente, errores de campo, cancelación y descarte, filtros y retorno de foco; además de las pruebas existentes de API y pedido.

Las confirmaciones usan dialog nativo con estilos propios y foco inicial en Cancelar. Los toasts usan una región accesible, no roban foco, muestran loaders indeterminados y conservan el estado permanente del último guardado. Solo se anuncia publicación tras verificar la firma pública. El aviso beforeunload del navegador no se puede personalizar y se conserva para recargar/cerrar. La navegación del logo y el cierre de sesión confirmados evitan activarlo innecesariamente.
