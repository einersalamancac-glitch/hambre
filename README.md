# Lector web — Los juegos del hambre

Lector de libro digital hecho solo con HTML + CSS + JavaScript (sin
frameworks, sin backend). Convierte el contenido real del PDF en texto
HTML reflowable, paginado dinámicamente al tamaño exacto de la
pantalla, con un efecto de "hoja que se dobla y gira" (page curl / page
flip) controlado con el dedo.

## Qué se hizo con el PDF (estrategia elegida)

El PDF tiene texto real, no escaneado (27 capítulos, ~99.700 palabras,
tipografía y tamaños consistentes en todo el libro). Por eso se eligió
la **opción A del punto 32**: extraer el texto real y reconstruirlo como
HTML, en vez de usar imágenes de página. Esto permite:

- Fondo negro real con texto nítido (no una imagen oscurecida).
- Tamaño de letra verdaderamente ajustable, con reflujo del texto.
- Un archivo final ligero (~700 KB en total, libro incluido) en vez de
  cientos de imágenes.

El texto se extrajo con un analizador de PDF que distingue, por tamaño
y posición de cada línea, los títulos de parte, los capítulos, los
párrafos normales y las dos canciones (que se conservan en cursiva,
como en el original). **No se resumió, tradujo ni modificó ningún
párrafo**: `js/book-data.js` contiene el texto extraído tal cual,
capítulo por capítulo.

## Cómo funciona la paginación

El libro no se divide en páginas fijas de antemano: `js/paginator.js`
mide, con el tamaño de letra y de pantalla actuales, cuánto texto cabe
en una pantalla y corta exactamente ahí — palabra por palabra si hace
falta, nunca a mitad de una palabra, y sin recolocar el párrafo entero:
lo que no cabe continúa como texto normal en la página siguiente. Por
eso, aunque subas el tamaño de letra al máximo, el texto se sigue
viendo como prosa normal, alineada a la izquierda (nunca justificada),
con los espacios entre palabras normales — nunca con esos huecos
grandes que aparecen cuando un texto justificado se estira para
rellenar una línea con pocas palabras.

Esto se recalcula automáticamente si cambias el tamaño de letra, si
giras el teléfono o si cambia el tamaño de la ventana, y el lector
intenta quedarse en el mismo capítulo (o en una posición equivalente)
al recalcular.

## Estructura de archivos

```
libro-web/
├── index.html          ← ábrelo directamente, es el lector completo
├── css/style.css        ← estilos, modo oscuro, layout responsive
├── js/book-data.js      ← el texto del libro (título, créditos, 27 capítulos)
├── js/storage.js        ← memoria de lectura (localStorage)
├── js/paginator.js      ← motor de paginación (mide y corta el texto)
├── js/page-turn.js      ← animación del giro de página (3D)
└── js/reader.js         ← controles, gestos, teclado, interfaz
```

## Cómo probarlo en tu computadora

1. Abre la carpeta `libro-web`.
2. Haz doble clic en `index.html` (o ábrelo desde el navegador con
   `Ctrl/Cmd + O`). Funciona directamente desde el disco, sin servidor.
3. Deberías ver la portada inmediatamente, con fondo negro.
4. Prueba:
   - Arrastrar el dedo (o el clic sostenido con el mouse) de derecha a
     izquierda: la página se dobla y pasa a la siguiente.
   - Arrastrar de izquierda a derecha: retrocede.
   - Un arrastre corto que sueltas antes de la mitad: la página vuelve
     a su sitio.
   - Tocar cerca del borde derecho/izquierdo: pasa/retrocede una
     página sin animación de arrastre.
   - Tocar el centro de la pantalla: aparecen/desaparecen los
     controles (arriba: índice y pantalla completa; abajo: tamaño de
     letra, barra de progreso y número de página).
   - Botones **A− / A+**: cambian el tamaño de letra (se recalculan las
     páginas al instante).
   - Cerrar la pestaña y volver a abrir `index.html`: debe continuar
     aproximadamente donde te quedaste.
   - En computadora: flechas ← → , barra espaciadora y Retroceso
     también cambian de página.

Si algún navegador bloquea `localStorage` al abrir el archivo con
`file://` (pasa a veces en Chrome con restricciones estrictas), el
lector sigue funcionando igual, solo que no recordará la página entre
sesiones hasta que lo subas a un hosting (con `http(s)://` esto no
ocurre).

## Cómo subirlo a Internet

Como es un sitio 100% estático (sin base de datos ni backend), sirve
cualquier hosting de archivos estáticos. Opciones sencillas y
gratuitas:

- **Netlify / Vercel**: arrastra la carpeta `libro-web` completa a su
  panel de "deploy" (Netlify tiene una zona de "arrastra tu carpeta
  aquí"). En segundos te da una URL pública.
- **GitHub Pages**: sube la carpeta a un repositorio de GitHub y activa
  "Pages" apuntando a la rama principal.
- **Cualquier hosting compartido tradicional**: sube la carpeta por FTP
  tal cual, sin cambiar nada, a la carpeta pública del sitio
  (`public_html`, `www`, etc.).

En todos los casos, no hay que tocar el código: la carpeta ya está
lista para servirse como está. Una vez subida, entra desde el teléfono
o cualquier computadora a la dirección que te dé el hosting.
