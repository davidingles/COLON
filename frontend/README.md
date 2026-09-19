# Frontend

Interfaz de áreas al estilo de un editor de código, montada con **Golden Layout**.
El primer paso implementado es una fila con **1 + 2 + 2 áreas** (una columna con
un área y dos columnas con dos áreas apiladas cada una).

Se puede:

- arrastrar cada **divisor** para repartir el espacio en un eje;
- poner el cursor en el **cruce** de un divisor vertical y uno horizontal y
  arrastrar para mover **las dos líneas a la vez** (redimensión en 2D);
- **dividir** un área y **fundir** dos áreas arrastrando desde las esquinas
  interiores de cada área (véase «Dividir y fundir áreas»);
- guardar la disposición automáticamente y recuperarla al volver a abrir la página;
- restablecer la disposición inicial y cambiar entre tema claro y oscuro.

## Requisitos

- Node.js (probado con Node 24)
- npm (probado con npm 11)

## Instalación

```powershell
cd frontend
npm install
```

## Arranque en desarrollo

```powershell
cd frontend
npm run dev
```

Servidor de desarrollo: `http://localhost:5173`. El puerto está fijado en `vite.config.js` con `strictPort`.

## Compilación de producción

```powershell
cd frontend
npm run build     # genera dist/
npm run preview   # sirve dist/ en local
```

## Estructura

```text
frontend/
├── index.html                        # barra superior y contenedores de la disposición
├── vite.config.js                    # servidor de desarrollo y proxy de /api
├── package.json                      # scripts y dependencias
└── src/
    ├── principal.js                  # punto de entrada: monta todo y conecta la barra
    ├── disposicion/
    │   ├── configuracion.js          # árbol 1 + 2 + 2, medidas y ajustes
    │   ├── areas.js                  # componente de relleno de cada área
    │   ├── docking.js                # dividir un área y quitar un área del árbol
    │   ├── gestos-areas.js           # gesto de las esquinas: dividir y fundir
    │   ├── esquinas.js               # manejadores de los cruces (redimensión en 2D)
    │   ├── persistencia.js           # guardado de la disposición y del tema
    │   └── estilos-disposicion.css   # estilos y temas claro/oscuro
    ├── main.js                       # (no montado) lógica del formulario
    ├── validaciones.js               # (no montado) validaciones en cliente
    ├── api.js                        # (no montado) peticiones a la API del backend
    └── estilos.css                   # (no montado) estilos del formulario
```

## Dependencias

- `golden-layout` (versión exacta `2.6.0`, código que se ejecuta en el navegador):
  gestiona el árbol de áreas, las pestañas y los divisores de un eje. Se eligió
  por ser la librería pedida para la disposición y por no requerir compilación
  propia: el paquete publica un `dist/esm` que Vite consume directamente.
- `vite` (dependencia de desarrollo): servidor de desarrollo y compilación.

## Cómo funciona la redimensión en dos ejes

Golden Layout solo dibuja divisores de un eje, así que en un cruce hay dos
divisores independientes y arrastrar justo ahí mueve una sola línea. La capa de
`esquinas.js` no reimplementa los tamaños: coloca un cuadrado transparente en
cada cruce y, al pulsarlo, le entrega a los divisores implicados el mismo
`pointerdown` que recibirían si se hubiera pulsado encima de su asa. A partir de
ahí cada divisor sigue el ratón por su cuenta, con su propia lógica de tamaños
mínimos. Un punto donde se juntan cuatro áreas agrupa tres divisores (la vertical
y las dos horizontales), y los tres se mueven juntos.

## Dividir y fundir áreas

Cada área tiene marcadas sus **esquinas interiores** con un cuadrado. Al pasar el
ratón por encima el cursor cambia a la flecha de cuatro direcciones y, al
arrastrar, ocurre una de dos cosas:

| Movimiento del arrastre | Resultado |
|---|---|
| Hacia dentro del área, más horizontal | División vertical: dos áreas lado a lado |
| Hacia dentro del área, más vertical | División horizontal: dos áreas apiladas |
| Hacia fuera, invadiendo otra área | Fusión: desaparece el área sobre la que se suelta |
| `Esc` antes de soltar | Se cancela sin cambios |

Mientras se arrastra se ve una **línea guía** en el sitio exacto donde quedará la
división, y al fundir se resaltan las dos áreas: en rojo la que va a desaparecer
y en azul la que permanece. La división reparte el espacio según dónde se suelte,
no siempre a mitad, igual que en Blender.

En una fusión **permanece el área desde la que empieza el arrastre** y desaparece
aquella sobre la que se suelta. Como la disposición se tesela con rectángulos, el
hueco liberado no siempre lo ocupa el área que permanece: si las dos áreas no son
vecinas dentro del mismo grupo (por ejemplo el Área 2 con el Área 4), el hueco lo
absorbe la vecina del grupo donde estaba el área eliminada.

Las dos operaciones se hacen sobre la configuración que devuelve `saveLayout` y
después se vuelve a cargar la disposición, de modo que sirven para cualquier
estructura y no solo para el 1 + 2 + 2 inicial. El precio es que **los componentes
se recrean**: hoy es indiferente porque las áreas son de relleno, pero cuando
muestren contenido real su estado tendrá que guardarse en `componentState`.

## Formulario de contacto y subida de archivos

El formulario que había en la página principal ya no se monta: `index.html` es
ahora el armazón de la disposición. Sus módulos (`main.js`, `validaciones.js`,
`api.js` y `estilos.css`) siguen en el proyecto, sin usar, para poder
recolocarlos dentro de una de las áreas cuando se decida.

## Contrato de API esperado

El frontend **todavía no tiene backend**: envía la petición y muestra el error HTTP que reciba.

- Método y ruta: `POST /api/subidas`
- Cuerpo: `multipart/form-data` con los campos `nombre` (texto), `telefono` (texto) y `archivo` (binario, un único archivo).
- Respuesta correcta: código `2xx`. El cuerpo puede ser JSON o estar vacío.

En desarrollo, el proxy de `vite.config.js` redirige `/api` a `http://localhost:3000`. Ese puerto es una suposición y hay que ajustarlo cuando exista el backend.

## Estado de verificación

- `npm run build` correcto con Vite 8.3.0.
- Consola del navegador sin errores propios.
- Validación en cliente comprobada en el navegador: campos vacíos, teléfono con letras.
- La petición `POST /api/subidas` se envía correctamente y responde `502` porque no hay ningún backend escuchando en el puerto 3000. Es el comportamiento esperado con el alcance elegido (solo frontend).
