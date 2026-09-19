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
import { MINIMO_ALTO_AREA, MINIMO_ANCHO_AREA, SEPARACION_ESQUINA_AREA, TAMANO_ESQUINA_AREA } from './configuracion.js';

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

      const rectContenido = contenido.getBoundingClientRect();
      if (rectContenido.width === 0 || rectContenido.height === 0) {
        continue;
      }

      // Hacen falta los dos rectángulos. Las esquinas se colocan dentro del
      // contenido, para no caer sobre la pestaña, pero el reparto se calcula
      // sobre el área completa: la pestaña ocupa sitio y, si no se cuenta, la
      // línea acaba por encima del ratón.
      const pila = contenido.closest('.lm_stack');
      const rectArea = (pila ?? contenido).getBoundingClientRect();
      const rects = { contenido: rectContenido, area: rectArea };

      for (const esquina of esquinasDelArea(rectContenido, rectEnvoltorio)) {
        capa.appendChild(crearEsquina(idArea, rects, esquina, rectEnvoltorio));
      }
    }
  }

  /**
   * Calcula las esquinas interiores de un área.
   *
   * No se pone la de arriba a la izquierda: el título del área está justo ahí y
   * el cuadradito quedaba encima del texto. Las otras tres bastan, porque lo que
   * decide si se divide o se funde es hacia dónde se arrastra, no desde qué
   * esquina se empieza.
   *
   * Es una esquina interior la que da a otra zona de la disposición: en las del
   * borde exterior no hay nada con lo que fundirse, así que se descartan.
   */
  function esquinasDelArea(rect, rectEnvoltorio) {
    const separacion = SEPARACION_ESQUINA_AREA + TAMANO_ESQUINA_AREA / 2;
    const candidatas = [
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
  function crearEsquina(idArea, rects, esquina, rectEnvoltorio) {
    const elemento = document.createElement('div');
    elemento.className = 'esquina-area';
    elemento.title = 'Arrastra hacia dentro para dividir y hacia otra área para fundir';
    elemento.style.width = `${TAMANO_ESQUINA_AREA}px`;
    elemento.style.height = `${TAMANO_ESQUINA_AREA}px`;
    elemento.style.left = `${esquina.x - rectEnvoltorio.left - TAMANO_ESQUINA_AREA / 2}px`;
    elemento.style.top = `${esquina.y - rectEnvoltorio.top - TAMANO_ESQUINA_AREA / 2}px`;

    elemento.addEventListener('pointerdown', (evento) => {
      iniciarGesto(evento, idArea, rects);
    });

    return elemento;
  }

  // --- Gesto en curso ---

  /** Arranca el gesto y se queda a la espera de saber hacia dónde va. */
  function iniciarGesto(evento, idArea, rects) {
    if (evento.button !== 0) {
      return;
    }

    // Evita que el navegador inicie una selección de texto con el arrastre.
    evento.preventDefault();

    gesto = {
      idArea,
      rects,
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

    if (contiene(gesto.rects.area, evento.clientX, evento.clientY)) {
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
      // Se reparte a lo ancho: la pestaña es una barra horizontal y no ocupa
      // anchura, así que no hay margen que descontar.
      gesto.proporcion = proporcionDePosicion(
        gesto.rects.area.left,
        gesto.rects.area.width,
        evento.clientX,
        MINIMO_ANCHO_AREA
      );
    } else {
      gesto.lado = recorridoY >= 0 ? LADO_DESPUES : LADO_ANTES;
      gesto.proporcion = proporcionDePosicion(
        gesto.rects.area.top,
        gesto.rects.area.height,
        evento.clientY,
        MINIMO_ALTO_AREA
      );
    }

    limpiarResaltados();
    mostrarGuia();
  }

  /**
   * Coloca la guía justo donde quedará la línea de la división.
   *
   * La posición sale de la proporción ya recortada, no del ratón, para que la
   * guía y el resultado coincidan siempre: si el recorte entra en juego, la
   * línea se detiene y deja de seguir al puntero.
   */
  function mostrarGuia() {
    if (guia === null) {
      guia = document.createElement('div');
      guia.className = 'guia-division';
      document.body.appendChild(guia);
    }

    const { area, contenido } = gesto.rects;
    guia.hidden = false;

    if (gesto.orientacion === ORIENTACION_VERTICAL) {
      guia.style.left = `${area.left + gesto.proporcion * area.width}px`;
      guia.style.top = `${contenido.top}px`;
      guia.style.width = '';
      guia.style.height = `${contenido.height}px`;
    } else {
      guia.style.left = `${contenido.left}px`;
      guia.style.top = `${area.top + gesto.proporcion * area.height}px`;
      guia.style.width = `${contenido.width}px`;
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

/**
 * Parte del área que queda antes de una posición.
 *
 * `minimo` es el tamaño mínimo de área que exige Golden Layout en ese eje. El
 * gesto lo respeta para que la línea no acabe saltando al soltar: si pidiéramos
 * una mitad más pequeña, la librería la agrandaría quitándole sitio a las áreas
 * vecinas. Cuando el área es tan pequeña que no caben dos mitades mínimas, se
 * reparte a medias, que es lo que termina haciendo la librería de todos modos.
 */
function proporcionDePosicion(inicio, tamano, posicion, minimo) {
  if (tamano <= 0) {
    return 0.5;
  }

  const minimoProporcion = Math.min(0.5, minimo / tamano);
  const bruta = (posicion - inicio) / tamano;
  return limitarProporcion(Math.min(1 - minimoProporcion, Math.max(minimoProporcion, bruta)));
}
