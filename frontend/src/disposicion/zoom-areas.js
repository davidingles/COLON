// Zoom del contenido de un área con Ctrl + rueda del ratón.
//
// El zoom se aplica al contenido del área sobre la que está el puntero, no a la
// disposición entera. Cambia de tamaño todo lo que hay dentro: tipografías,
// botones, bordes y espacios.

import { PASO_ZOOM } from './configuracion.js';
import { aplicarEscala, leerEscala, limitarEscala } from './areas.js';

// El identificador del área está en su pila, así que se busca desde el elemento
// sobre el que está el ratón hacia arriba.
const SELECTOR_AREA = '[data-area-id]';

// La clase del contenido del área, que es lo que se escala.
const SELECTOR_CONTENIDO = '.area';

/**
 * Crea el zoom por área.
 *
 * @param {object} opciones
 * @param {HTMLElement} opciones.envoltorio Elemento que contiene la disposición.
 * @param {Function} opciones.alCambiar Se llama tras cada cambio de zoom, para
 *   que la disposición se vuelva a guardar con el estado nuevo.
 */
export function crearZoomDeAreas({ envoltorio, alCambiar }) {
  function iniciar() {
    // `passive: false` es imprescindible: hay que poder cancelar el zoom que el
    // navegador aplica a toda la página con Ctrl + rueda, o se aplicarían los
    // dos a la vez.
    envoltorio.addEventListener('wheel', alGirarLaRueda, { passive: false });
  }

  function destruir() {
    envoltorio.removeEventListener('wheel', alGirarLaRueda);
  }

  /** Sube o baja el zoom del área que hay bajo el puntero. */
  function alGirarLaRueda(evento) {
    if (!evento.ctrlKey) {
      return;
    }

    const destino = evento.target instanceof Element ? evento.target : null;
    const contenido = destino?.closest(SELECTOR_AREA)?.querySelector(SELECTOR_CONTENIDO);

    if (contenido === null || contenido === undefined) {
      return;
    }

    // Aunque el zoom ya esté en un extremo se cancela el del navegador: si no,
    // al llegar al límite la página empezaría a acercarse sola.
    evento.preventDefault();

    const paso = evento.deltaY < 0 ? PASO_ZOOM : -PASO_ZOOM;
    aplicarEscala(contenido, limitarEscala(leerEscala(contenido) + paso));

    alCambiar();
  }

  return { iniciar, destruir };
}
