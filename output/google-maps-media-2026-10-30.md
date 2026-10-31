# Selección reciente de Fusión X8

Consulta realizada el 30 de octubre de 2026 con Maps JavaScript API y Places API (New), seguida de comprobación de las fechas en Google Maps. Corte aplicado: julio de 2025. Las fechas son las indicadas por Google en la ficha, con precisión de mes; no se infieren de la fecha de consulta.

## Fotografías elegidas

| Imagen | Fecha visible en Maps | Autor | Uso |
| --- | --- | --- | --- |
| [Exterior nocturno y vehículo decorativo](https://www.google.com/maps/place//data=!3m4!1e2!3m2!1sCIABIhB7HopsKLG86bYA0Avg_qfX!2e10!4m2!3m1!1s0x9662d7e38864993f:0xdba53a6fe4cf1115) | Abril de 2026 | Nuretam | Fondo de portada y galería |
| [Sándwich de mechada](https://www.google.com/maps/place//data=!3m4!1e2!3m2!1sCIABIhAQF7_gR5BOtm4vdKU-wvxf!2e10!4m2!3m1!1s0x9662d7e38864993f:0xdba53a6fe4cf1115) | Enero de 2026 | Carlos Toledo | Galería |
| [Postre de chocolate con helado](https://www.google.com/maps/place//data=!3m4!1e2!3m2!1sCIABIhCkIt997GpjX_aRObkaVVYn!2e10!4m2!3m1!1s0x9662d7e38864993f:0xdba53a6fe4cf1115) | Agosto de 2025 | Tihare Pérez Montecinos | Galería |

El respaldo local es la publicación de cinnamon rolls de Fusión X8 de julio de 2026, que ya estaba incorporada al proyecto. Se muestra desde el primer renderizado mientras carga la foto del exterior, y permanece si la API falla. La foto de sándwiches de marzo de 2024 dejó de mostrarse en la galería.

## Vídeo localizado

Entrada y terraza, Carlos Toledo, enero de 2026. Duración mostrada: **0:01**. Su enlace está en la galería y en `src/data/google-media.json`. No se usa como fondo continuo por su duración. No se ha descargado un archivo de vídeo ni se ha creado un bucle artificial.

## Material descartado

- Terraza diurna, Viviana del Carmen Morales Solano: noviembre de 2023.
- Salón interior, Natalia Suarez: octubre de 2024.

## Integración

La consulta devolvió diez fotos. Se muestran solo las que coinciden con los identificadores de la selección comprobada. Cada visita obtiene URLs nuevas con `Photo.getURI()`, sin guardar los archivos de fotos de la API ni sus URLs temporales. Se muestran los créditos y los enlaces de los autores y de Google Maps. La portada y las reseñas comparten la respuesta de Place Details durante la visita.

Places API entrega fotos, dimensiones, autores y enlaces, pero no la fecha de publicación de cada foto ni archivos de vídeo. [Documentación oficial de Place Photos](https://developers.google.com/maps/documentation/javascript/place-photos).

## Restauración posterior de la portada

A petición del usuario, la foto del exterior se recuperó a su resolución original de 3000 × 4000 y se restauró con image_gen para reducir la suavidad y el ruido de la toma nocturna. La portada utiliza ahora el archivo local `src/assets/venue/fusion-x8-exterior-restaurado-horizontal.png` (1942 × 809), convertido a WebP de calidad 95 durante la compilación. Se identifica como imagen restaurada y conserva el crédito y enlace a Nuretam. La galería mantiene las fotos sin esta restauración, servidas mediante Google Maps Platform.

## Nuestra esencia: terraza de febrero de 2025

Para esta sección se amplió el rango solicitado a enero de 2025–octubre de 2026. Se eligió la foto de rodrigo benavides, publicada en febrero de 2025, identificador `CIHM0ogKEICAgMDAtd-4Dw`. Fecha y autor comprobados en la categoría Ambiente de Google Maps. La versión disponible de mayor resolución mide 2304 × 3072 px. Se conserva el original en `src/assets/venue/fusion-x8-terraza-febrero-2025.jpg` y se sirve como WebP de 1600 px y calidad 90. El encuadre CSS centra la mesa y la vegetación; no se ha aplicado IA ni alterado el lugar.

Se revisó también una foto del salón con luces cálidas, pero su fecha de abril de 2024 queda fuera del rango. Places API sigue devolviendo diez fotografías y la elegida no aparece en esa selección; se localizó en la galería pública de Google Maps. Su crédito y el enlace al autor permanecen visibles en la sección. Los datos de procedencia están en `aboutPhoto` de `src/data/google-media.json`; el corte de julio de 2025 de la galería principal permanece independiente.

## Cambio de selección a partir de referencias del usuario

El usuario propuso cinco enlaces concretos y pidió retirar personas, mejorar nitidez y corregir inclinación. Se revisaron los cinco en Google Maps: fachada de Yordano Escaff (junio de 2023), salón de Natalia Suarez (octubre de 2024), rincón de Jaime Jofre (junio de 2024), salón y mural de Yordano Escaff (junio de 2023) y salón de Viviana del Carmen Morales Solano (abril de 2024). Se tomó esta selección expresa como excepción al corte anterior de enero de 2025, comunicando las fechas reales antes de editar.

Se eligió la cuarta referencia, `CIHM0ogKEICAgIDx4tL2Ug`, porque muestra el mural de marca, las mesas y la iluminación del local en una composición horizontal. La foto original se conserva en `src/assets/venue/fusion-x8-salon-yordano-original.jpg`. Se descargó la versión de 2048 × 1152 disponible en la página; el enlace identifica una fuente de 4000 × 2250.

La edición con la herramienta integrada image_gen retiró personas, corrigió inclinación y mejoró claridad y exposición. El resultado se guarda en `src/assets/venue/fusion-x8-salon-restaurado-v2.png` y se sirve como WebP de calidad 92. El crédito indica Yordano Escaff, junio de 2023 e Imagen editada; no se presenta como una fotografía nueva de 2026. El prompt completo está en `output/imagegen/nuestra-esencia-salon-prompt.txt`. La selección de la galería principal mantiene su rango independiente.
