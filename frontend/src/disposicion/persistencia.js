// Guardado de la disposición y del tema elegido en el almacenamiento local.
//
// Aquí vive también la conversión entre lo que devuelve `saveLayout` y lo que
// acepta `loadLayout`, porque es un detalle que comparten el guardado y las
// operaciones de dividir y fundir áreas.

import { LayoutConfig } from 'golden-layout';

const CLAVE_DISPOSICION = 'pwa-tareas-03:disposicion';
const CLAVE_DISPOSICIONES = 'pwa-tareas-03:disposiciones';
const CLAVE_TEMA = 'pwa-tareas-03:tema';

export const TEMA_CLARO = 'claro';
export const TEMA_OSCURO = 'oscuro';
export const TEMA_POR_DEFECTO = TEMA_OSCURO;

/** Guarda la disposición actual. Si no se puede, solo avisa por consola. */
export function guardarDisposicion(disposicion) {
  try {
    const configuracion = disposicion.saveLayout();
    localStorage.setItem(CLAVE_DISPOSICION, JSON.stringify(configuracion));
  } catch (error) {
    console.warn('No se ha podido guardar la disposición.', error);
  }
}

/**
 * Devuelve la disposición guardada, o null si no hay ninguna utilizable.
 */
export function leerDisposicion() {
  let texto;
  try {
    texto = localStorage.getItem(CLAVE_DISPOSICION);
  } catch (error) {
    console.warn('No se ha podido leer la disposición guardada.', error);
    return null;
  }

  if (texto === null) {
    return null;
  }

  let configuracion;
  try {
    configuracion = JSON.parse(texto);
  } catch {
    return null;
  }

  if (configuracion === null || typeof configuracion !== 'object') {
    return null;
  }

  return aConfiguracionCargable(configuracion);
}

/**
 * Convierte una configuración de Golden Layout en algo que `loadLayout` acepta.
 *
 * `saveLayout` entrega una configuración ya resuelta y `loadLayout` espera una
 * configuración normal, así que se convierte cuando la librería ofrece el
 * conversor y, si no, se entrega tal cual.
 */
export function aConfiguracionCargable(configuracion) {
  if (typeof LayoutConfig.fromResolved === 'function' && LayoutConfig.isResolved(configuracion)) {
    return LayoutConfig.fromResolved(configuracion);
  }

  return configuracion;
}

/** Borra la disposición guardada. */
export function borrarDisposicion() {
  try {
    localStorage.removeItem(CLAVE_DISPOSICION);
  } catch (error) {
    console.warn('No se ha podido borrar la disposición guardada.', error);
  }
}

/**
 * Guarda las configuraciones de áreas personalizadas.
 *
 * Cada entrada es `{ nombre, configuracion }`, donde la configuración es lo que
 * devuelve `saveLayout` en ese momento: estructura, secciones, tamaños y zoom.
 */
export function guardarDisposiciones(lista) {
  try {
    localStorage.setItem(CLAVE_DISPOSICIONES, JSON.stringify(lista));
  } catch (error) {
    console.warn('No se han podido guardar las configuraciones.', error);
  }
}

/** Devuelve las configuraciones personalizadas guardadas, ya utilizables. */
export function leerDisposiciones() {
  let texto;
  try {
    texto = localStorage.getItem(CLAVE_DISPOSICIONES);
  } catch (error) {
    console.warn('No se han podido leer las configuraciones guardadas.', error);
    return [];
  }

  if (texto === null) {
    return [];
  }

  let lista;
  try {
    lista = JSON.parse(texto);
  } catch {
    return [];
  }

  if (!Array.isArray(lista)) {
    return [];
  }

  return lista
    .filter(
      (entrada) =>
        esObjeto(entrada) &&
        typeof entrada.nombre === 'string' &&
        esObjeto(entrada.configuracion)
    )
    .map((entrada) => ({
      nombre: entrada.nombre,
      configuracion: aConfiguracionCargable(entrada.configuracion)
    }));
}

/** Indica si el valor recibido es un objeto plano, no nulo ni un array. */
function esObjeto(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

/** Devuelve el tema guardado, o null si no hay ninguno válido. */
export function leerTema() {
  let tema;
  try {
    tema = localStorage.getItem(CLAVE_TEMA);
  } catch {
    return null;
  }

  return tema === TEMA_CLARO || tema === TEMA_OSCURO ? tema : null;
}

/** Guarda el tema elegido. */
export function guardarTema(tema) {
  try {
    localStorage.setItem(CLAVE_TEMA, tema);
  } catch (error) {
    console.warn('No se ha podido guardar el tema.', error);
  }
}
