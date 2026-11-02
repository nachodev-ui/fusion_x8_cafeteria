# Sección de comodidades

`Amenities.astro` presenta cuatro tarjetas con fotografías retocadas del propio local. Se mantiene el título «Tu gente, tu mascota y un buen momento» y los cuatro servicios y descripciones de `src/data/business.ts`.

Referencias de 21st.dev consultadas:

- [Image Showcase, Ravi Katiyar](https://21st.dev/@ravikatiyar162/components/image-showcase): protagonismo de imágenes, profundidad e interacción pausada.
- [Reveal on hover, YoucefBnm](https://21st.dev/@youcefbnm/components/reveal-on-hover): movimiento de imagen al interactuar con la tarjeta.

La composición y el código son propios, con Astro, CSS y JavaScript nativo. No se añaden dependencias de animación. En escritorio se usa una tarjeta principal para mascotas, una tarjeta ancha para terraza y dos tarjetas menores para invierno y familias. En móvil hay desplazamiento horizontal con ajuste de posición, botones anterior/siguiente, indicador de posición y navegación con flechas, Inicio y Fin. No hay avance automático. La información permanece visible sin hover y sin JavaScript; sin JavaScript se conserva el desplazamiento nativo.

El movimiento de imagen es suave y limitado a pocos píxeles con ratón. Se omite si el sistema solicita movimiento reducido. El carrusel admite teclado y controles de 44 px, y no desplaza verticalmente la página al pasar de tarjeta.

## Imágenes

Se sustituyeron las cuatro escenas enteramente sintéticas por retoques de las tres fotografías entregadas por el usuario, usando la herramienta integrada `image_gen`. El pie de la sección indica «Fotografías del local · Retocadas». No se añadieron animales ni servicios a partir de las imágenes.

- `src/assets/amenities/terrace-photo-retouched.png`: terraza real al atardecer, con sombras recuperadas y menor destello. También se usa para «Pet friendly», con otro encuadre; no representa una visita real con mascota.
- `src/assets/amenities/winter-photo-retouched.png`: calefactor original e interior, sin clientes, manos ni personas en la televisión.
- `src/assets/amenities/family-photo-retouched.png`: fotografía de la silla, sin la niña, brazos, manos ni cartas que distraen.

Las fuentes originales se conservan sin modificar en los archivos locales `public/references/silla_bebé.png`, `terraza.png` y `calefacción.png`; no se incluyen en este commit ni se publican como recursos nuevos. La primera fuente contiene la atribución «Raúl Castro, 12 de enero de 2025». Solo se publican las versiones retocadas sin personas. Las áreas antes tapadas se reconstruyen: la forma exacta del asiento de bebé no puede verificarse a partir de la foto original. No se debe presentar este retoque como una prueba del modelo exacto de silla disponible.

Se conserva la dirección de cámara y la arquitectura reconocible de cada toma, con encuadres verticales y luz coherentes. Hacer coincidir literalmente el ángulo de tres ubicaciones distintas obligaría a inventar áreas del local; se evita esa reinterpretación. El conjunto final de prompts está en `docs/amenities-art-prompts.json`. Astro sirve variantes WebP de 360, 640 y 960 px con carga diferida, dimensiones reservadas y decodificación asíncrona. No dependen de un servidor externo de imágenes ni de un generador en tiempo de ejecución.

## Comprobaciones

Verificación de tipos, compilación y pruebas DOM para contenidos, imágenes locales, disposición de escritorio, controles de carrusel en móvil, límites de navegación, teclado, movimiento reducido y uso sin JavaScript. Sin capturas de pantalla ni comprobaciones visuales de la página.
