// Elemento seleccionado en cada sección.
//
// La selección es de la SECCIÓN, no del área. Si hay dos áreas mostrando
// «Familia», una con «Miembros» y otra con «Familiar», las dos comparten la
// misma selección: al elegir un miembro en la lista, la ficha de al lado cambia
// sola, sin recargar nada.
//
// Es un almacén en memoria a propósito: es una selección de trabajo, no un dato
// que tenga que sobrevivir a cerrar la página.

const seleccionados = new Map();
const suscriptores = new Map();

/** Deja seleccionado un elemento de la sección. */
export function seleccionar(idSeccion, idElemento) {
  if (seleccionados.get(idSeccion) === idElemento) {
    return;
  }

  seleccionados.set(idSeccion, idElemento);
  avisar(idSeccion);
}

/** Devuelve el elemento seleccionado de la sección, o null si no hay ninguno. */
export function obtenerSeleccion(idSeccion) {
  return seleccionados.get(idSeccion) ?? null;
}

/**
 * Avisa cuando cambia la selección de una sección.
 * Devuelve la función para darse de baja.
 */
export function alCambiarSeleccion(idSeccion, funcion) {
  const conjunto = suscriptores.get(idSeccion) ?? new Set();
  conjunto.add(funcion);
  suscriptores.set(idSeccion, conjunto);

  return () => conjunto.delete(funcion);
}

function avisar(idSeccion) {
  for (const funcion of suscriptores.get(idSeccion) ?? []) {
    funcion();
  }
}
