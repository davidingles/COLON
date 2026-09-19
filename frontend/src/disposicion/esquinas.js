// Capa de esquinas: manejadores en los cruces de divisores.
//
// Golden Layout solo dibuja divisores de un eje. En un cruce hay dos divisores
// independientes que no se solapan, así que arrastrar justo en el cruce mueve
// una sola línea. Esta capa coloca un cuadrado transparente encima de cada
// cruce y, al pulsarlo, reenvía un `pointerdown` sintético a las asas de todos
// los divisores que pasan por ese punto.
//
// Con eso quedan activos a la vez varios `DragListener` de Golden Layout y un
// único movimiento del ratón mueve todas las líneas del cruce, reutilizando
// además su lógica de tamaños mínimos y de recorte del recorrido.

// En una fila, el divisor lleva la clase `lm_horizontal` y dibuja una línea
// vertical (separa áreas de izquierda a derecha).
const SELECTOR_DIVISORES_VERTICALES = '.lm_splitter.lm_horizontal';

// En una columna, el divisor lleva la clase `lm_vertical` y dibuja una línea
// horizontal (separa áreas de arriba abajo).
const SELECTOR_DIVISORES_HORIZONTALES = '.lm_splitter.lm_vertical';

// Elemento que recibe el `pointerdown` dentro de cada divisor.
const SELECTOR_ASA = '.lm_drag_handle';

// Clase que se pone en `body` mientras se arrastra una esquina; sirve para
// cambiar el cursor durante el arrastre.
const CLASE_ARRASTRE_ESQUINA = 'lm_esquina_arrastrando';

// Clase del manejador que se está arrastrando, para resaltar solo ese.
const CLASE_ESQUINA_ACTIVA = 'esquina--activa';

// Distancia (en píxeles) por debajo de la cual dos cruces se consideran el
// mismo punto y se atienden con un solo manejador.
const TOLERANCIA_AGRUPACION = 1;

/**
 * Crea la capa de esquinas.
 *
 * @param {object} opciones
 * @param {HTMLElement} opciones.envoltorio Elemento de referencia para situar
 *   los manejadores; debe ser el contenedor posicionado de la capa.
 * @param {HTMLElement} opciones.capa Elemento que contiene los manejadores.
 * @param {object} opciones.disposicion Instancia de Golden Layout.
 * @param {number} opciones.tamano Lado del manejador en píxeles.
 */
export function crearCapaDeEsquinas({ envoltorio, capa, disposicion, tamano }) {
  let cuadroPendiente = null;
  let observador = null;

  /** Agrupa varias peticiones seguidas en un único recálculo por fotograma. */
  function programarActualizacion() {
    if (cuadroPendiente !== null) {
      return;
    }
    cuadroPendiente = requestAnimationFrame(() => {
      cuadroPendiente = null;
      actualizar();
    });
  }

  /** Recoloca los manejadores según los cruces que haya ahora mismo. */
  function actualizar() {
    capa.replaceChildren();

    const rectEnvoltorio = envoltorio.getBoundingClientRect();
    if (rectEnvoltorio.width === 0 || rectEnvoltorio.height === 0) {
      return;
    }

    const verticales = consultarDivisores(SELECTOR_DIVISORES_VERTICALES);
    const horizontales = consultarDivisores(SELECTOR_DIVISORES_HORIZONTALES);
    if (verticales.length === 0 || horizontales.length === 0) {
      return;
    }

    const grosor = Math.max(verticales[0].rect.width, horizontales[0].rect.height, 1);

    for (const cruce of buscarCruces(verticales, horizontales, grosor)) {
      capa.appendChild(crearManejador(cruce, rectEnvoltorio, tamano));
    }
  }

  /**
   * Localiza los cruces y, para cada uno, los divisores que lo forman.
   *
   * Un mismo punto puede estar formado por más de dos divisores: donde se
   * juntan cuatro áreas, la línea vertical y las dos horizontales que la
   * tocan comparten cruce. Por eso los cruces se agrupan por posición y cada
   * manejador mueve después todos los divisores que llegan a ese punto.
   *
   * Los divisores se acumulan a partir de los pares que ya acepta `seCruzan`.
   * Buscarlos después por un solo eje sería incorrecto: en la disposición
   * inicial las dos líneas horizontales están a la misma altura, así que
   * cualquier filtro por altura las incluiría a las dos.
   */
  function buscarCruces(verticales, horizontales, grosor) {
    const cruces = [];

    for (const vertical of verticales) {
      for (const horizontal of horizontales) {
        if (!seCruzan(vertical.rect, horizontal.rect, grosor)) {
          continue;
        }

        const x = vertical.rect.left + vertical.rect.width / 2;
        const y = horizontal.rect.top + horizontal.rect.height / 2;

        let cruce = cruces.find(
          (candidato) =>
            Math.abs(candidato.x - x) <= TOLERANCIA_AGRUPACION &&
            Math.abs(candidato.y - y) <= TOLERANCIA_AGRUPACION
        );

        if (cruce === undefined) {
          cruce = { x, y, divisores: [] };
          cruces.push(cruce);
        }

        for (const item of [vertical, horizontal]) {
          if (!cruce.divisores.includes(item.divisor)) {
            cruce.divisores.push(item.divisor);
          }
        }
      }
    }

    return cruces;
  }

  /** Recoge los divisores visibles junto con su rectángulo en pantalla. */
  function consultarDivisores(selector) {
    const resultado = [];

    for (const divisor of envoltorio.querySelectorAll(selector)) {
      const rect = divisor.getBoundingClientRect();
      // Se descartan los divisores ocultos o sin grosor. No hace falta
      // comprobar que estén dentro del envoltorio: Golden Layout redondea sus
      // medidas y pueden sobresalir una fracción de píxel, y los paneles
      // separados en otra ventana viven en otro documento.
      if (rect.width === 0 || rect.height === 0) {
        continue;
      }
      resultado.push({ divisor, rect });
    }

    return resultado;
  }

  /** Indica si ambos rectángulos se tocan o se solapan. */
  function seCruzan(rectVertical, rectHorizontal, tolerancia) {
    const solapeHorizontal =
      Math.min(rectVertical.right, rectHorizontal.right) -
      Math.max(rectVertical.left, rectHorizontal.left);
    const solapeVertical =
      Math.min(rectVertical.bottom, rectHorizontal.bottom) -
      Math.max(rectVertical.top, rectHorizontal.top);

    return solapeHorizontal >= -tolerancia && solapeVertical >= -tolerancia;
  }

  /** Crea el cuadrado que se sitúa en un cruce de divisores. */
  function crearManejador(cruce, rectEnvoltorio, lado) {
    const manejador = document.createElement('div');
    manejador.className = 'esquina';
    manejador.title = 'Arrastra para mover las dos líneas a la vez';
    manejador.style.width = `${lado}px`;
    manejador.style.height = `${lado}px`;
    manejador.style.left = `${cruce.x - rectEnvoltorio.left - lado / 2}px`;
    manejador.style.top = `${cruce.y - rectEnvoltorio.top - lado / 2}px`;

    manejador.addEventListener('pointerdown', (evento) => {
      iniciarArrastreEnEsquina(evento, cruce.divisores, manejador);
    });

    return manejador;
  }

  /**
   * Arranca a la vez el arrastre de todos los divisores del cruce.
   *
   * No se toca nada interno de Golden Layout: se le entrega a cada divisor el
   * `pointerdown` que esperaría si el usuario hubiese pulsado justo encima de
   * su asa. A partir de ahí cada divisor sigue el movimiento real del ratón
   * por su cuenta, con sus propios tamaños mínimos.
   */
  function iniciarArrastreEnEsquina(evento, divisores, manejador) {
    if (evento.button !== 0) {
      return;
    }

    // Evita que el navegador inicie una selección de texto con el arrastre.
    evento.preventDefault();

    const opciones = {
      bubbles: true,
      cancelable: true,
      isPrimary: true,
      pointerId: evento.pointerId,
      pointerType: evento.pointerType,
      clientX: evento.clientX,
      clientY: evento.clientY
    };

    for (const divisor of divisores) {
      obtenerAsa(divisor).dispatchEvent(new PointerEvent('pointerdown', opciones));
    }

    document.body.classList.add(CLASE_ARRASTRE_ESQUINA);
    manejador.classList.add(CLASE_ESQUINA_ACTIVA);

    const terminar = () => {
      document.removeEventListener('pointerup', terminar);
      document.removeEventListener('pointercancel', terminar);
      document.body.classList.remove(CLASE_ARRASTRE_ESQUINA);
      manejador.classList.remove(CLASE_ESQUINA_ACTIVA);
      programarActualizacion();
    };

    document.addEventListener('pointerup', terminar);
    document.addEventListener('pointercancel', terminar);
  }

  /** Devuelve el asa del divisor, o el propio divisor si no tuviese asa. */
  function obtenerAsa(divisor) {
    return divisor.querySelector(SELECTOR_ASA) ?? divisor;
  }

  /** Conecta los avisos que obligan a recolocar los manejadores. */
  function iniciar() {
    observador = new ResizeObserver(programarActualizacion);
    observador.observe(envoltorio);

    window.addEventListener('resize', programarActualizacion);
    disposicion.on('stateChanged', programarActualizacion);
    disposicion.on('itemCreated', programarActualizacion);
    disposicion.on('itemDestroyed', programarActualizacion);

    programarActualizacion();
  }

  /** Deshace todo lo que haya dejado la capa. */
  function destruir() {
    if (cuadroPendiente !== null) {
      cancelAnimationFrame(cuadroPendiente);
      cuadroPendiente = null;
    }

    if (observador !== null) {
      observador.disconnect();
      observador = null;
    }

    window.removeEventListener('resize', programarActualizacion);
    disposicion.off('stateChanged', programarActualizacion);
    disposicion.off('itemCreated', programarActualizacion);
    disposicion.off('itemDestroyed', programarActualizacion);

    capa.replaceChildren();
  }

  return { iniciar, destruir, actualizar: programarActualizacion };
}
