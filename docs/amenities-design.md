# Sección de comodidades

`Amenities.astro` sustituye las cuatro columnas con iconos por una composición de tarjetas con escenas ilustrativas de cafetería. Se mantiene el título «Tu gente, tu mascota y un buen momento» y los cuatro servicios y descripciones de `src/data/business.ts`.

Referencias de 21st.dev consultadas:

- [Image Showcase, Ravi Katiyar](https://21st.dev/@ravikatiyar162/components/image-showcase): protagonismo de imágenes, profundidad e interacción pausada.
- [Reveal on hover, YoucefBnm](https://21st.dev/@youcefbnm/components/reveal-on-hover): movimiento de imagen al interactuar con la tarjeta.

La composición y el código son propios, con Astro, CSS y JavaScript nativo. No se añaden dependencias de animación. En escritorio se usa una tarjeta principal para mascotas, una tarjeta ancha para terraza y dos tarjetas menores para invierno y familias. En móvil hay desplazamiento horizontal con ajuste de posición, botones anterior/siguiente, indicador de posición y navegación con flechas, Inicio y Fin. No hay avance automático. La información permanece visible sin hover y sin JavaScript; sin JavaScript se conserva el desplazamiento nativo.

El movimiento de imagen es suave y limitado a pocos píxeles con ratón. Se omite si el sistema solicita movimiento reducido. El carrusel admite teclado y controles de 44 px, y no desplaza verticalmente la página al pasar de tarjeta.

## Imágenes

Se crearon con la herramienta integrada `image_gen` cuatro escenas nuevas. No son fotografías documentales de Fusión x8; el pie de la sección indica «Imágenes referenciales». No se añadieron servicios a partir de las imágenes.

- `src/assets/amenities/pet-friendly.png`: mascota junto a mesa de cafetería y agua.
- `src/assets/amenities/terrace.png`: terraza con plantas, mesa y luz cálida.
- `src/assets/amenities/winter.png`: rincón con manta, café y calefacción.
- `src/assets/amenities/family.png`: silla de bebé junto a una mesa.

El conjunto final de prompts está en `docs/amenities-art-prompts.json`. Los originales permanecen en el proyecto y Astro sirve variantes WebP de 360, 640 y 960 px con carga diferida, dimensiones reservadas y decodificación asíncrona. No dependen de un servidor externo de imágenes ni de un generador en tiempo de ejecución.

## Comprobaciones

Verificación de tipos, compilación y pruebas DOM para contenidos, imágenes locales, disposición de escritorio, controles de carrusel en móvil, límites de navegación, teclado, movimiento reducido y uso sin JavaScript. Sin capturas de pantalla ni comprobaciones visuales de la página.
