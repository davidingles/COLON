// Registro de las secciones que ya tienen vistas propias.
//
// Añadir una sección nueva es crear su módulo y sumarlo a este mapa: el área no
// necesita saber nada más.

import * as familia from './familia.js';

const MODULOS = { familia };

/**
 * Crea la vista de una sección.
 *
 * Devuelve `{ elemento, destruir }`, o null si la sección no tiene ese módulo o
 * el módulo no conoce la vista; entonces el área enseña su aviso.
 */
export function crearVista(idSeccion, idVista, contexto) {
  const modulo = MODULOS[idSeccion];
  if (modulo === undefined) {
    return null;
  }

  return modulo.crearVista(idVista, contexto);
}
