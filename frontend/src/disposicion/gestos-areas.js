// Gesto de dividir y fundir áreas, imitando el de Blender.
//
// Blender marca las esquinas de cada área: al pasar el ratón por una de ellas
// el cursor cambia, y al arrastrar ocurre una de dos cosas:
//
// - si el arrastre se queda dentro del área, el área se parte en dos;
// - si el arrastre invade otra área, las dos se funden y desaparece el área
//   sobre la que se suelta.
//
// El eje con más recorrido decide cómo queda la línea de la división, tal como
// lo describe el manual de Blender: «dragging from an area corner left/right
// will split the area vertically, to split the area horizontally drag up/down».
//
// Las esquinas de este gesto van desplazadas hacia dentro del área para no
// chocar con el cuadrado del cruce, que es el que redimensiona en dos ejes.

import {
  LADO_ANTES,
  LADO_DESPUES,
  limitarProporcion,
  ORIENTACION_HORIZONTAL,
  ORIENTACION_VERTICAL
} from './docking.js';
import { SEPARACION_ESQUINA_AREA, TAMANO_ESQUINA_AREA } from './configuracion.js';

// Recorrido mínimo del ratón antes de decidir si el gesto divide o funde.
const MINIMO_DESPLAZAMIENTO = 6;

// El identificador del área vive en su contenido: el mismo elemento sirve para
// medirla, para saber sobre qué área está el ratón y para resaltarla. La pila
// del área (que incluye la pestaña) se busca con `closest` cuando hace falta.
const SELECTOR_CONTENIDO_AREA = '.lm_content[data-area-id]';

// Clase que se pone en `body` mientras dura el gesto.
const CLASE_GESTO_EN_CURSO = 'lm_gesto_areas';

// Clases del resaltado: el área que desaparece y la que se queda.
const CLASE_AREA_QUE_DESAPARECE = 'area--desaparece';
const CLASE_AREA_QUE_PERMANECE = 'area--permanece';

/**
 * Crea el gesto de dividir y fundir.
 *
 * @param {object} opciones
 * @param {HTMLElement} opciones.envoltorio Contenedor posicionado de la capa.
 * @param {HTMLElement} opciones.capa Capa donde se dibujan las esquinas.
 * @param {object} opciones.disposicion Instancia de Golden Layout.
 * @param {Function} opciones.alDividir Se llama con (idArea, orientación, lado,
 *   proporción) cuando el gesto pide dividir.
 * @param {Function} opciones.alFundir Se llama con (idOrigen, idDestino) cuando
 *   el gesto pide fundir.
 */
export function crearGestosDeAreas({ envoltorio, capa, disposicion, alDividir, alFundir }) {
  let cuadroPendiente = null;
  let observador = null;
  let guia = null;
  let gesto = null;

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

  /** Recoloca las esquinas según las áreas que haya ahora mismo. */
  function actualizar() {
    capa.replaceChildren();

    const rectEnvoltorio = envoltorio.getBoundingClientRect();
    if (rectEnvoltorio.width === 0 || rectEnvoltorio.height === 0) {
      return;
    }

    for (const contenido of envoltorio.querySelectorAll(SELECTOR_CONTENIDO_AREA)) {
      const idArea = contenido.dataset.areaId;
      if (idArea === undefined || idArea === '') {
        continue;
      }

      const rect = contenido.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        continue;
      }

      for (const esquina of esquinasDelArea(rect, rectEnvoltorio)) {
        capa.appendChild(crearEsquina(idArea, rect, esquina, rectEnvoltorio));
      }
    }
  }

  /**
   * Calcula las esquinas interiores de un área.
   *
   * Es una esquina interior la que da a otra zona de la disposición: en las del
   * borde exterior no hay nada con lo que fundirse, así que se descartan.
   */
  function esquinasDelArea(rect, rectEnvoltorio) {
    const separacion = SEPARACION_ESQUINA_AREA + TAMANO_ESQUINA_AREA / 2;
    const candidatas = [
      {
        x: rect.left + separacion,
        y: rect.top + separacion,
        interiorX: rect.left > rectEnvoltorio.left + 1,
        interiorY: rect.top > rectEnvoltorio.top + 1
      },
      {
        x: rect.right - separacion,
        y: rect.top + separacion,
        interiorX: rect.right < rectEnvoltorio.right - 1,
        interiorY: rect.top > rectEnvoltorio.top + 1
      },
      {
        x: rect.left + separacion,
        y: rect.bottom - separacion,
        interiorX: rect.left > rectEnvoltorio.left + 1,
        interiorY: rect.bottom < rectEnvoltorio.bottom - 1
      },
      {
        x: rect.right - separacion,
        y: rect.bottom - separacion,
        interiorX: rect.right < rectEnvoltorio.right - 1,
        interiorY: rect.bottom < rectEnvoltorio.bottom - 1
      }
    ];

    return candidatas.filter((esquina) => esquina.interiorX || esquina.interiorY);
  }

  /** Crea la esquina que arranca el gesto. */
  function crearEsquina(idArea, rect, esquina, rectEnvoltorio) {
    const elemento = document.createElement('div');
    elemento.className = 'esquina-area';
    elemento.title = 'Arrastra hacia dentro para dividir y hacia otra área para fundir';
    elemento.style.width = `${TAMANO_ESQUINA_AREA}px`;
    elemento.style.height = `${TAMANO_ESQUINA_AREA}px`;
    elemento.style.left = `${esquina.x - rectEnvoltorio.left - TAMANO_ESQUINA_AREA / 2}px`;
    elemento.style.top = `${esquina.y - rectEnvoltorio.top - TAMANO_ESQUINA_AREA / 2}px`;

    elemento.addEventListener('pointerdown', (evento) => {
      iniciarGesto(evento, idArea, rect);
    });

    return elemento;
  }

  // --- Gesto en curso ---

  /** Arranca el gesto y se queda a la espera de saber hacia dónde va. */
  function iniciarGesto(evento, idArea, rect) {
    if (evento.button !== 0) {
      return;
    }

    // Evita que el navegador inicie una selección de texto con el arrastre.
    evento.preventDefault();

    gesto = {
      idArea,
      rect,
      xInicial: evento.clientX,
      yInicial: evento.clientY,
      modo: null,
      orientacion: null,
      lado: null,
      idDestino: null,
      proporcion: 0.5
    };

    document.body.classList.add(CLASE_GESTO_EN_CURSO);
    document.addEventListener('pointermove', seguirGesto);
    document.addEventListener('pointerup', terminarGesto);
    document.addEventListener('pointercancel', cancelarGesto);
    document.addEventListener('keydown', alPulsarTecla);
    document.addEventListener('contextmenu', evitarMenuContextual);
  }

  /** Decide si el gesto está dividiendo o fundiendo, y lo muestra. */
  function seguirGesto(evento) {
    if (gesto === null) {
      return;
    }

    const recorridoX = evento.clientX - gesto.xInicial;
    const recorridoY = evento.clientY - gesto.yInicial;
    const recorrido =
      Math.abs(recorridoX) > Math.abs(recorridoY) ? recorridoX : recorridoY;

    // Hasta que el ratón no se mueve lo suficiente no se sabe qué va a pasar:
    // así un clic suelto en la esquina no cambia nada.
    if (Math.max(Math.abs(recorridoX), Math.abs(recorridoY)) < MINIMO_DESPLAZAMIENTO) {
      return;
    }

    const idDestino = areaBajoElPuntero(evento.clientX, evento.clientY);

    if (idDestino !== null && idDestino !== gesto.idArea) {
      marcarFusion(idDestino);
      return;
    }

    if (contiene(gesto.rect, evento.clientX, evento.clientY)) {
      marcarDivision(recorridoX, recorridoY, evento);
      return;
    }

    // Ni dentro del área ni sobre otra: no hay nada que hacer.
    olvidarGesto();
  }

  /** Prepara (o deshace) el gesto como fusión. */
  function marcarFusion(idDestino) {
    if (gesto.modo === 'fusion' && gesto.idDestino === idDestino) {
      return;
    }

    gesto.modo = 'fusion';
    gesto.idDestino = idDestino;
    gesto.orientacion = null;
    ocultarGuia();

    limpiarResaltados();
    resaltar(gesto.idArea, CLASE_AREA_QUE_PERMANECE);
    resaltar(idDestino, CLASE_AREA_QUE_DESAPARECE);
  }

  /** Prepara el gesto como división y coloca la guía donde partirá. */
  function marcarDivision(recorridoX, recorridoY, evento) {
    // Moverse a los lados parte en vertical (dos áreas lado a lado); moverse
    // arriba o abajo parte en horizontal (dos áreas apiladas).
    const vertical = Math.abs(recorridoX) >= Math.abs(recorridoY);

    gesto.modo = 'division';
    gesto.idDestino = null;
    gesto.orientacion = vertical ? ORIENTACION_VERTICAL : ORIENTACION_HORIZONTAL;

    if (vertical) {
      gesto.lado = recorridoX >= 0 ? LADO_DESPUES : LADO_ANTES;
      gesto.proporcion = proporcionDePosicion(
        gesto.rect.left,
        gesto.rect.width,
        evento.clientX
      );
    } else {
      gesto.lado = recorridoY >= 0 ? LADO_DESPUES : LADO_ANTES;
      gesto.proporcion = proporcionDePosicion(
        gesto.rect.top,
        gesto.rect.height,
        evento.clientY
      );
    }

    limpiarResaltados();
    mostrarGuia();
  }

  /** Coloca la guía justo donde quedará la línea de la división. */
  function mostrarGuia() {
    if (guia === null) {
      guia = document.createElement('div');
      guia.className = 'guia-division';
      document.body.appendChild(guia);
    }

    const rect = gesto.rect;
    guia.hidden = false;

    if (gesto.orientacion === ORIENTACION_VERTICAL) {
      guia.style.left = `${rect.left + gesto.proporcion * rect.width}px`;
      guia.style.top = `${rect.top}px`;
      guia.style.width = '';
      guia.style.height = `${rect.height}px`;
    } else {
      guia.style.left = `${rect.left}px`;
      guia.style.top = `${rect.top + gesto.proporcion * rect.height}px`;
      guia.style.width = `${rect.width}px`;
      guia.style.height = '';
    }
  }

  function ocultarGuia() {
    if (guia !== null) {
      guia.hidden = true;
    }
  }

  /** Aplica el gesto cuando se suelta el botón principal. */
  function terminarGesto(evento) {
    const gestoTerminado = gesto;

    // Con cualquier botón que no sea el principal se cancela, como en Blender.
    if (evento !== undefined && evento.button !== 0) {
      limpiarGesto();
      return;
    }

    limpiarGesto();

    if (gestoTerminado === null) {
      return;
    }

    if (gestoTerminado.modo === 'fusion' && gestoTerminado.idDestino !== null) {
      alFundir(gestoTerminado.idArea, gestoTerminado.idDestino);
    } else if (gestoTerminado.modo === 'division') {
      alDividir(
        gestoTerminado.idArea,
        gestoTerminado.orientacion,
        gestoTerminado.lado,
        gestoTerminado.proporcion
      );
    }
  }

  /** Cancela el gesto sin tocar la disposición. */
  function cancelarGesto() {
    limpiarGesto();
  }

  /** El teclado también cancela, como en Blender con Esc. */
  function alPulsarTecla(evento) {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      cancelarGesto();
    }
  }

  /**
   * El botón derecho cancela el gesto, como en Blender.
   *
   * No se puede detectar con `pointerup`: al pulsar el derecho con el izquierdo
   * ya apretado, el navegador solo avisa con `contextmenu`.
   */
  function evitarMenuContextual(evento) {
    evento.preventDefault();
    cancelarGesto();
  }

  /** Deja el gesto sin efecto y quita todo lo que había pintado. */
  function olvidarGesto() {
    if (gesto === null) {
      return;
    }
    gesto.modo = null;
    gesto.idDestino = null;
    ocultarGuia();
    limpiarResaltados();
  }

  /** Quita los avisos, la guía y los escuchadores del gesto. */
  function limpiarGesto() {
    gesto = null;

    document.removeEventListener('pointermove', seguirGesto);
    document.removeEventListener('pointerup', terminarGesto);
    document.removeEventListener('pointercancel', cancelarGesto);
    document.removeEventListener('keydown', alPulsarTecla);
    document.removeEventListener('contextmenu', evitarMenuContextual);

    document.body.classList.remove(CLASE_GESTO_EN_CURSO);
    ocultarGuia();
    limpiarResaltados();
  }

  /** Devuelve el identificador del área que hay bajo un punto de la pantalla. */
  function areaBajoElPuntero(x, y) {
    const elemento = document.elementFromPoint(x, y);
    if (elemento === null) {
      return null;
    }

    const contenido = elemento.closest(SELECTOR_CONTENIDO_AREA);
    if (contenido !== null) {
      return contenido.dataset.areaId ?? null;
    }

    // Al soltar sobre la pestaña no se encuentra el contenido desde ahí, pero sí
    // la pila del área, que lo contiene.
    const pila = elemento.closest('.lm_stack');
    const contenidoDeLaPila = pila?.querySelector(SELECTOR_CONTENIDO_AREA);
    return contenidoDeLaPila?.dataset.areaId ?? null;
  }

  /** Resalta el área indicada, pestaña incluida. */
  function resaltar(idArea, clase) {
    for (const contenido of envoltorio.querySelectorAll(SELECTOR_CONTENIDO_AREA)) {
      if (contenido.dataset.areaId === idArea) {
        marcarResaltado(contenido, clase, true);
      }
    }
  }

  /** Quita el resaltado de todas las áreas. */
  function limpiarResaltados() {
    for (const contenido of envoltorio.querySelectorAll(SELECTOR_CONTENIDO_AREA)) {
      marcarResaltado(contenido, CLASE_AREA_QUE_DESAPARECE, false);
      marcarResaltado(contenido, CLASE_AREA_QUE_PERMANECE, false);
    }
  }

  /**
   * Pone o quita una clase de resaltado en el contenido del área y en su pila.
   * La pila es la que permite teñir también la pestaña.
   */
  function marcarResaltado(contenido, clase, activa) {
    contenido.classList.toggle(clase, activa);
    contenido.closest('.lm_stack')?.classList.toggle(clase, activa);
  }

  /** Conecta los avisos que obligan a recolocar las esquinas. */
  function iniciar() {
    observador = new ResizeObserver(programarActualizacion);
    observador.observe(envoltorio);

    window.addEventListener('resize', programarActualizacion);
    disposicion.on('stateChanged', programarActualizacion);
    disposicion.on('itemCreated', programarActualizacion);
    disposicion.on('itemDestroyed', programarActualizacion);

    programarActualizacion();
  }

  /** Deshace todo lo que haya dejado el gesto. */
  function destruir() {
    limpiarGesto();

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

    if (guia !== null) {
      guia.remove();
      guia = null;
    }

    capa.replaceChildren();
  }

  return { iniciar, destruir, actualizar: programarActualizacion };
}

/** Indica si un punto está dentro de un rectángulo. */
function contiene(rect, x, y) {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

/** Parte del rectángulo que queda antes de una posición, dentro de un margen. */
function proporcionDePosicion(inicio, tamano, posicion) {
  if (tamano <= 0) {
    return 0.5;
  }
  return limitarProporcion((posicion - inicio) / tamano);
}
