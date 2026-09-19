// Punto de entrada de la interfaz de áreas.
//
// Monta la disposición de Golden Layout, la rellena con áreas de relleno, añade
// la capa de esquinas para redimensionar en dos ejes, el gesto para dividir y
// fundir áreas, y conecta la barra superior (tema y restablecimiento).

import 'golden-layout/dist/css/goldenlayout-base.css';
import './disposicion/estilos-disposicion.css';

import { GoldenLayout } from 'golden-layout';

import { crearConfiguracionInicial, TAMANO_ESQUINA } from './disposicion/configuracion.js';
import { registrarAreas } from './disposicion/areas.js';
import { crearCapaDeEsquinas } from './disposicion/esquinas.js';
import { crearGestosDeAreas } from './disposicion/gestos-areas.js';
import { dividirArea, listarAreas, quitarArea } from './disposicion/docking.js';
import {
  aConfiguracionCargable,
  borrarDisposicion,
  guardarDisposicion,
  guardarTema,
  leerDisposicion,
  leerTema,
  TEMA_CLARO,
  TEMA_OSCURO,
  TEMA_POR_DEFECTO
} from './disposicion/persistencia.js';

const RETARDO_GUARDADO = 300;

const envoltorio = document.querySelector('#envoltorio');
const contenedorDisposicion = document.querySelector('#disposicion');
const capaEsquinas = document.querySelector('#capa-esquinas');
const capaAreas = document.querySelector('#capa-areas');
const botonRestablecer = document.querySelector('#boton-restablecer');
const botonTema = document.querySelector('#boton-tema');

const disposicion = new GoldenLayout(contenedorDisposicion);

// El contenedor no es el `body`, así que hay que pedir explícitamente que la
// disposición se recoloque cuando cambie el tamaño de su contenedor.
disposicion.resizeWithContainerAutomatically = true;

registrarAreas(disposicion);
cargarDisposicion();

const capa = crearCapaDeEsquinas({
  envoltorio,
  capa: capaEsquinas,
  disposicion,
  tamano: TAMANO_ESQUINA
});
capa.iniciar();

const gestos = crearGestosDeAreas({
  envoltorio,
  capa: capaAreas,
  disposicion,
  alDividir: (idArea, orientacion, lado, proporcion) =>
    aplicarCambioDeArbol((raiz) => dividirArea(raiz, idArea, orientacion, lado, proporcion)),
  alFundir: (idOrigen, idDestino) =>
    aplicarCambioDeArbol((raiz) => quitarArea(raiz, idDestino))
});
gestos.iniciar();

aplicarTema(leerTema() ?? TEMA_POR_DEFECTO);

// --- Disposición ---

/**
 * Carga la disposición guardada y, si no hay ninguna o no sirve, la inicial.
 */
function cargarDisposicion() {
  const guardada = leerDisposicion();
  if (guardada === null || !tieneAreasIdentificadas(guardada)) {
    borrarDisposicion();
    disposicion.loadLayout(crearConfiguracionInicial());
    return;
  }

  try {
    disposicion.loadLayout(guardada);
  } catch (error) {
    // Una disposición guardada por una versión distinta puede no ser válida:
    // se descarta y se vuelve a la inicial en lugar de dejar la página rota.
    console.warn('La disposición guardada no se ha podido cargar; se usa la inicial.', error);
    borrarDisposicion();
    disposicion.loadLayout(crearConfiguracionInicial());
  }
}

/**
 * Comprueba que la disposición guardada identifique todas sus áreas.
 *
 * Las primeras versiones no guardaban identificadores, y sin ellos no se puede
 * localizar un área para dividirla ni para fundirla.
 */
function tieneAreasIdentificadas(configuracion) {
  if (configuracion.root === undefined) {
    return false;
  }

  const areas = listarAreas(configuracion.root);
  return (
    areas.length > 0 &&
    areas.every((area) => typeof area.id === 'string' && area.id !== '')
  );
}

// --- Cambios en el árbol de áreas ---

/**
 * Aplica un cambio al árbol de áreas y vuelve a cargar la disposición.
 *
 * El cambio se hace sobre la configuración que devuelve `saveLayout`, que ya
 * recoge los tamaños que el usuario haya ajustado arrastrando los divisores, y
 * el resultado se carga de nuevo. Dividir y fundir recrean por tanto los
 * componentes: hoy da igual, porque las áreas son de relleno, pero cuando
 * muestren contenido real su estado tendrá que ir en `componentState`.
 */
function aplicarCambioDeArbol(transformar) {
  const guardada = disposicion.saveLayout();
  if (guardada.root === undefined) {
    return;
  }

  const raizNueva = transformar(guardada.root);
  if (raizNueva === null) {
    // La operación no tenía nada que hacer; la disposición se deja igual.
    return;
  }

  try {
    disposicion.loadLayout(aConfiguracionCargable({ ...guardada, root: raizNueva }));
  } catch (error) {
    console.error('No se ha podido aplicar el cambio de áreas.', error);
  }
}

let temporizadorGuardado = null;

/** Guarda la disposición agrupando ráfagas de cambios seguidos. */
function guardarDisposicionConRetardo() {
  if (temporizadorGuardado !== null) {
    clearTimeout(temporizadorGuardado);
  }
  temporizadorGuardado = setTimeout(() => {
    temporizadorGuardado = null;
    guardarDisposicion(disposicion);
  }, RETARDO_GUARDADO);
}

disposicion.on('stateChanged', guardarDisposicionConRetardo);
window.addEventListener('beforeunload', () => guardarDisposicion(disposicion));

botonRestablecer.addEventListener('click', () => {
  borrarDisposicion();
  disposicion.loadLayout(crearConfiguracionInicial());
});

// --- Tema ---

/** Aplica el tema indicado y deja el botón con la acción contraria. */
function aplicarTema(tema) {
  document.documentElement.dataset.tema = tema;

  const esOscuro = tema === TEMA_OSCURO;
  botonTema.textContent = esOscuro ? 'Tema claro' : 'Tema oscuro';
  botonTema.setAttribute('aria-pressed', String(esOscuro));
}

botonTema.addEventListener('click', () => {
  const actual = document.documentElement.dataset.tema;
  const nuevo = actual === TEMA_OSCURO ? TEMA_CLARO : TEMA_OSCURO;
  aplicarTema(nuevo);
  guardarTema(nuevo);
});
