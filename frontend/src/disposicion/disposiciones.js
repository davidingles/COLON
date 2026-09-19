// Botones de configuración de áreas de la cabecera.
//
// Hay tres disposiciones predefinidas, las que haya guardado el usuario y un
// botón para guardar la disposición actual como una nueva.

import { DISPOSICIONES_PREDEFINIDAS } from './configuracion.js';
import { guardarDisposiciones, leerDisposiciones } from './persistencia.js';

// Longitud máxima del nombre de una configuración guardada.
const MAXIMO_NOMBRE = 24;

/**
 * Crea la barra de configuraciones.
 *
 * @param {object} opciones
 * @param {HTMLElement} opciones.contenedor Elemento donde se colocan los
 *   botones, a la derecha del título de la cabecera.
 * @param {object} opciones.disposicion Instancia de Golden Layout, para poder
 *   guardar la disposición actual.
 * @param {Function} opciones.alAplicar Se llama con la configuración elegida.
 */
export function crearBarraDeDisposiciones({ contenedor, disposicion, alAplicar }) {
  let guardadas = [];

  function iniciar() {
    guardadas = leerDisposiciones();
    dibujar();
  }

  /** Vuelve a pintar todos los botones. */
  function dibujar() {
    contenedor.replaceChildren();

    for (const predefinida of DISPOSICIONES_PREDEFINIDAS) {
      contenedor.appendChild(
        crearBoton(predefinida.nombre, predefinida.descripcion, () =>
          alAplicar(predefinida.crear())
        )
      );
    }

    for (const guardada of guardadas) {
      contenedor.appendChild(crearBotonGuardado(guardada));
    }

    contenedor.appendChild(crearBotonAnadir());
  }

  /** Crea un botón de configuración. */
  function crearBoton(nombre, descripcion, alPulsar) {
    const boton = document.createElement('button');
    boton.className = 'boton-disposicion';
    boton.type = 'button';
    boton.textContent = nombre;
    boton.title = descripcion;
    boton.addEventListener('click', alPulsar);

    return boton;
  }

  /**
   * Crea el botón de una configuración guardada.
   *
   * Son dos botones y no uno con una cruz dentro porque meter un botón en otro
   * no es HTML válido: el de al lado se encarga de borrarla.
   */
  function crearBotonGuardado(guardada) {
    const grupo = document.createElement('span');
    grupo.className = 'disposicion';

    grupo.appendChild(
      crearBoton(guardada.nombre, `Aplicar «${guardada.nombre}»`, () =>
        alAplicar(guardada.configuracion)
      )
    );

    const borrar = document.createElement('button');
    borrar.className = 'disposicion__borrar';
    borrar.type = 'button';
    borrar.textContent = '×';
    borrar.title = `Borrar «${guardada.nombre}»`;
    borrar.setAttribute('aria-label', `Borrar la configuración ${guardada.nombre}`);
    borrar.addEventListener('click', () => borrarGuardada(guardada));

    grupo.appendChild(borrar);
    return grupo;
  }

  /** Crea el botón que guarda la disposición actual. */
  function crearBotonAnadir() {
    const boton = document.createElement('button');
    boton.className = 'boton-disposicion boton-disposicion--anadir';
    boton.type = 'button';
    boton.textContent = '+';
    boton.title = 'Guardar la disposición actual como una configuración';
    boton.setAttribute('aria-label', 'Guardar la disposición actual');
    boton.addEventListener('click', guardarActual);

    return boton;
  }

  /**
   * Guarda la disposición que hay ahora mismo con un nombre nuevo.
   *
   * El nombre se pone solo: los diálogos del navegador (`prompt`) no funcionan
   * en todos los entornos, y depender de ellos dejaría el botón sin hacer nada.
   */
  function guardarActual() {
    const nombre = nombreLibre();
    guardadas.push({ nombre, configuracion: disposicion.saveLayout() });
    guardarDisposiciones(guardadas);
    dibujar();
  }

  /** Busca un nombre que no esté ya en uso. */
  function nombreLibre() {
    let numero = guardadas.length + 1;

    while (guardadas.some((guardada) => guardada.nombre === `Personalizada ${numero}`)) {
      numero += 1;
    }

    return `Personalizada ${numero}`;
  }

  /** Quita una configuración guardada. */
  function borrarGuardada(guardada) {
    guardadas = guardadas.filter((otra) => otra !== guardada);
    guardarDisposiciones(guardadas);
    dibujar();
  }

  return { iniciar };
}
