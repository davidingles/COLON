// Punto de entrada de la interfaz de áreas.
//
// Monta la disposición de Golden Layout, la rellena con áreas de relleno, añade
// la capa de esquinas para redimensionar en dos ejes, el gesto para dividir y
// fundir áreas, y conecta la barra superior (tema y restablecimiento).

import 'golden-layout/dist/css/goldenlayout-base.css';
import './disposicion/estilos-disposicion.css';
import './secciones/estilos-secciones.css';

import { GoldenLayout } from 'golden-layout';

import { crearConfiguracionInicial, SECCIONES, TAMANO_ESQUINA } from './disposicion/configuracion.js';
import { registrarAreas } from './disposicion/areas.js';
import { crearCapaDeEsquinas } from './disposicion/esquinas.js';
import { crearGestosDeAreas } from './disposicion/gestos-areas.js';
import { crearZoomDeAreas } from './disposicion/zoom-areas.js';
import { crearBarraDeDisposiciones } from './disposicion/disposiciones.js';
import { cargarMiembros } from './secciones/miembros.js';
import { dividirArea, fundirAreas, listarAreas } from './disposicion/docking.js';
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
const zonaDisposiciones = document.querySelector('#disposiciones');
const botonRestablecer = document.querySelector('#boton-restablecer');
const botonTema = document.querySelector('#boton-tema');

const disposicion = new GoldenLayout(contenedorDisposicion);

// El contenedor no es el `body`, así que hay que pedir explícitamente que la
// disposición se recoloque cuando cambie el tamaño de su contenedor.
disposicion.resizeWithContainerAutomatically = true;

registrarAreas(disposicion, () => guardarDisposicionConRetardo());
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
    aplicarCambioDeArbol((raiz) => fundirAreas(raiz, idOrigen, idDestino))
});
gestos.iniciar();

const zoom = crearZoomDeAreas({
  envoltorio,
  // Guardar la disposición es también guardar el zoom: viaja dentro del estado
  // de cada área.
  alCambiar: () => guardarDisposicionConRetardo()
});
zoom.iniciar();

const configuraciones = crearBarraDeDisposiciones({
  contenedor: zonaDisposiciones,
  disposicion,
  alAplicar: (configuracion) => {
    try {
      disposicion.loadLayout(aConfiguracionCargable(configuracion));
      guardarDisposicionConRetardo();
    } catch (error) {
      console.error('No se ha podido aplicar la configuración elegida.', error);
    }
  }
});
configuraciones.iniciar();

// Los miembros viven en la base de datos: se piden una vez al arrancar y las
// vistas se enteran por los avisos de `miembros.js`.
cargarMiembros();

aplicarTema(leerTema() ?? TEMA_POR_DEFECTO);

// --- Disposición ---

/**
 * Carga la disposición guardada y, si no hay ninguna o no sirve, la inicial.
 */
function cargarDisposicion() {
  const guardada = leerDisposicion();
  if (guardada === null || !esDisposicionUtilizable(guardada)) {
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
 * Comprueba que la disposición guardada se pueda usar tal cual.
 *
 * Hacen falta dos cosas en cada área: identificador (para poder dividirla y
 * fundirla) y una sección válida (para saber qué muestra). Las disposiciones
 * guardadas por versiones anteriores no tienen ninguna de las dos, así que se
 * descartan en vez de dejar las áreas con valores inventados.
 */
function esDisposicionUtilizable(configuracion) {
  if (configuracion.root === undefined) {
    return false;
  }

  const areas = listarAreas(configuracion.root);
  return (
    areas.length > 0 &&
    areas.every((area) => {
      const estado = area.componentState;

      return (
        typeof area.id === 'string' &&
        area.id !== '' &&
        estado !== null &&
        typeof estado === 'object' &&
        // Las disposiciones del formato anterior guardaban `titulo` y
        // `descripcion` dentro del estado. Esos campos ya no se usan y delatan
        // que la disposición es vieja, aunque tenga sección.
        estado.titulo === undefined &&
        SECCIONES.some((seccion) => seccion.id === estado.seccion)
      );
    })
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

  // El botón no lleva texto: su icono y su ayuda dicen a qué tema se pasa. El
  // icono que toca lo enseña el CSS según el tema, aquí solo va el texto de
  // ayuda para quien navegue con lector de pantalla o vea el «tooltip».
  const esOscuro = tema === TEMA_OSCURO;
  const accion = esOscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro';

  botonTema.setAttribute('aria-pressed', String(esOscuro));
  botonTema.setAttribute('aria-label', accion);
  botonTema.title = accion;
}

botonTema.addEventListener('click', () => {
  const actual = document.documentElement.dataset.tema;
  const nuevo = actual === TEMA_OSCURO ? TEMA_CLARO : TEMA_OSCURO;
  aplicarTema(nuevo);
  guardarTema(nuevo);
});
