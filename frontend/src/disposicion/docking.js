// Operaciones sobre el árbol de áreas: dividir un área y fundir dos.
//
// Se trabaja sobre lo que devuelve `saveLayout()`, que es una configuración ya
// resuelta: los tamaños son números acompañados de su unidad. Los nodos nuevos
// se crean clonando los que ya existen, para no tener que reconstruir a mano
// todos los campos que Golden Layout espera encontrar en una configuración
// resuelta.

import { PREFIJO_ID_AREA } from './configuracion.js';

// Orientación de la línea que separa las dos mitades al dividir.
// Vertical: las áreas quedan una al lado de la otra.
// Horizontal: las áreas quedan una encima de la otra.
export const ORIENTACION_VERTICAL = 'vertical';
export const ORIENTACION_HORIZONTAL = 'horizontal';

// Mitad en la que queda el área nueva.
export const LADO_ANTES = 'antes';
export const LADO_DESPUES = 'despues';

// Golden Layout exige que los hijos de una fila o de una columna expresen su
// tamaño en porcentaje: si se mezclan unidades, falla al calcular los tamaños.
const UNIDAD_PORCENTAJE = '%';
const TAMANO_COMPLETO = 100;

const PREFIJO_ID_GRUPO = 'grupo-';

// Proporción mínima que se reserva a cada mitad al dividir, para que ninguna
// quede prácticamente invisible.
const PROPORCION_MINIMA = 0.15;

/**
 * Recorre el árbol y llama a `visitar` con cada nodo y su situación.
 *
 * Los nodos del árbol son objetos con `content` (o sin él, en el caso de los
 * componentes), así que basta con recorrer esa propiedad.
 */
function recorrer(nodo, visitar, padre = null, contenedor = null, indice = -1) {
  visitar(nodo, padre, contenedor, indice);

  if (Array.isArray(nodo.content)) {
    for (let i = 0; i < nodo.content.length; i++) {
      recorrer(nodo.content[i], visitar, nodo, nodo.content, i);
    }
  }
}

/**
 * Índice que relaciona cada nodo con dónde está colocado.
 *
 * Trabajar con una identidad de objeto como clave permite localizar cualquier
 * nodo (y su padre) sin volver a recorrer el árbol en cada operación.
 */
function indexarSituaciones(raiz) {
  const situaciones = new Map();

  recorrer(raiz, (nodo, padre, contenedor, indice) => {
    situaciones.set(nodo, { padre, contenedor, indice });
  });

  return situaciones;
}

/**
 * Reparte identificadores que todavía no estén usados.
 *
 * Se usa el mismo reparto para todo lo que se cree en una operación, de modo
 * que dos nodos nuevos no puedan quedarse con el mismo identificador.
 */
function crearAsignadorDeIdentificadores(raiz) {
  const usados = new Set();
  recorrer(raiz, (nodo) => {
    if (typeof nodo.id === 'string') {
      usados.add(nodo.id);
    }
  });

  return (prefijo) => {
    let numero = 1;
    while (usados.has(`${prefijo}${numero}`)) {
      numero += 1;
    }

    const identificador = `${prefijo}${numero}`;
    usados.add(identificador);
    return identificador;
  };
}

/** Devuelve todas las áreas del árbol. */
export function listarAreas(raiz) {
  const areas = [];

  recorrer(raiz, (nodo) => {
    if (nodo.type === 'component') {
      areas.push(nodo);
    }
  });

  return areas;
}

/**
 * Busca el área indicada.
 *
 * Devuelve el área, la pila que la envuelve, el grupo al que pertenece esa pila
 * (null si la pila es la raíz) y la posición de la pila dentro del grupo.
 */
export function buscarArea(raiz, idArea) {
  const area = listarAreas(raiz).find((nodo) => nodo.id === idArea);
  if (area === undefined) {
    return null;
  }

  const situaciones = indexarSituaciones(raiz);
  const pila = situaciones.get(area).padre;
  if (pila === null) {
    return { area, pila: null, grupo: null, indice: -1 };
  }

  const situacionDeLaPila = situaciones.get(pila);
  return {
    area,
    pila,
    grupo: situacionDeLaPila.padre,
    indice: situacionDeLaPila.indice
  };
}

/**
 * Divide el área indicada en dos.
 *
 * `orientacion` es cómo queda la línea que las separa y `lado` en qué mitad va
 * el área nueva. `proporcion` es la parte que se queda el área original, así
 * que 0,5 reparte a medias.
 *
 * Devuelve una raíz nueva (que puede ser la misma, ya modificada), o null si no
 * había nada que dividir.
 */
export function dividirArea(raiz, idArea, orientacion, lado, proporcion) {
  const encontrado = buscarArea(raiz, idArea);
  if (encontrado === null || encontrado.pila === null) {
    return null;
  }

  const situaciones = indexarSituaciones(raiz);
  const nuevoIdentificador = crearAsignadorDeIdentificadores(raiz);

  const tipoDeGrupo = orientacion === ORIENTACION_VERTICAL ? 'row' : 'column';
  const parteDelOrigen = limitarProporcion(proporcion);
  const tamanoOriginal = encontrado.pila.size;

  const nuevaPila = crearPila(
    nuevoIdentificador,
    encontrado.pila,
    encontrado.area,
    tamanoOriginal * (1 - parteDelOrigen)
  );

  const grupo = encontrado.grupo;

  if (grupo !== null && grupo.type === tipoDeGrupo) {
    // El grupo ya divide en la orientación pedida: basta con dejar la pila
    // nueva al lado de la que se divide y repartir el tamaño.
    const posicion = lado === LADO_ANTES ? encontrado.indice : encontrado.indice + 1;
    grupo.content.splice(posicion, 0, nuevaPila);

    encontrado.pila.size = tamanoOriginal * parteDelOrigen;
    encontrado.pila.sizeUnit = UNIDAD_PORCENTAJE;
    return raiz;
  }

  // Hay que envolver la pila en un grupo nuevo con la orientación pedida. El
  // grupo hereda el sitio y el tamaño de la pila, y dentro las dos mitades se
  // reparten el espacio.
  encontrado.pila.size = parteDelOrigen * TAMANO_COMPLETO;
  encontrado.pila.sizeUnit = UNIDAD_PORCENTAJE;
  nuevaPila.size = (1 - parteDelOrigen) * TAMANO_COMPLETO;
  nuevaPila.sizeUnit = UNIDAD_PORCENTAJE;

  const contenido =
    lado === LADO_ANTES ? [nuevaPila, encontrado.pila] : [encontrado.pila, nuevaPila];

  const grupoNuevo = crearGrupo(
    nuevoIdentificador,
    grupo,
    tipoDeGrupo,
    contenido,
    tamanoOriginal,
    encontrado.pila.isClosable
  );

  return reemplazarNodo(raiz, situaciones, encontrado.pila, grupoNuevo);
}

/**
 * Quita el área indicada y reparte su hueco.
 *
 * Es la operación que hay detrás de fundir dos áreas: la que se suelta
 * desaparece y el espacio se reparte entre las que quedan. Cuando un grupo se
 * queda con un solo hijo, el grupo se sustituye por ese hijo, que hereda su
 * tamaño; así el árbol no acumula grupos de un solo elemento.
 *
 * Devuelve una raíz nueva (que puede ser la misma, ya modificada), o null si no
 * había nada que quitar o si era la última área que quedaba.
 */
export function quitarArea(raiz, idArea) {
  const encontrado = buscarArea(raiz, idArea);
  if (encontrado === null || encontrado.grupo === null) {
    return null;
  }

  // La disposición no puede quedarse sin ninguna área.
  if (listarAreas(raiz).length <= 1) {
    return null;
  }

  const situaciones = indexarSituaciones(raiz);
  const grupo = encontrado.grupo;
  grupo.content.splice(encontrado.indice, 1);

  if (grupo.content.length === 0) {
    return quitarNodo(raiz, situaciones, grupo);
  }

  if (grupo.content.length === 1) {
    const superviviente = grupo.content[0];
    superviviente.size = grupo.size;
    superviviente.sizeUnit = grupo.sizeUnit;
    return reemplazarNodo(raiz, situaciones, grupo, superviviente);
  }

  return raiz;
}

/** Crea la pila de un área nueva a partir de la pila de otra existente. */
function crearPila(nuevoIdentificador, pilaModelo, areaModelo, tamano) {
  const id = nuevoIdentificador(PREFIJO_ID_AREA);
  const numero = id.slice(PREFIJO_ID_AREA.length);
  const titulo = `Área ${numero}`;

  const area = {
    ...areaModelo,
    id,
    title: titulo,
    componentState: {
      id,
      titulo,
      descripcion: `Creada al dividir «${areaModelo.title ?? areaModelo.id}»`
    },
    size: TAMANO_COMPLETO,
    sizeUnit: UNIDAD_PORCENTAJE
  };

  return {
    ...pilaModelo,
    id: nuevoIdentificador(PREFIJO_ID_GRUPO),
    activeItemIndex: 0,
    content: [area],
    size: tamano,
    sizeUnit: UNIDAD_PORCENTAJE
  };
}

/**
 * Crea un grupo (fila o columna) que envuelve a la pila que se divide.
 *
 * Si ya existe un grupo se clona para conservar sus campos tal cual; solo hay
 * que construirlo a mano cuando la disposición entera es un área suelta y, por
 * tanto, no hay ningún grupo que copiar.
 */
function crearGrupo(nuevoIdentificador, grupoModelo, tipo, contenido, tamano, esCerrable) {
  if (grupoModelo !== null) {
    return {
      ...grupoModelo,
      type: tipo,
      content: contenido,
      size: tamano,
      sizeUnit: UNIDAD_PORCENTAJE
    };
  }

  return {
    type: tipo,
    content: contenido,
    size: tamano,
    sizeUnit: UNIDAD_PORCENTAJE,
    minSize: undefined,
    minSizeUnit: UNIDAD_PORCENTAJE,
    id: nuevoIdentificador(PREFIJO_ID_GRUPO),
    isClosable: esCerrable === true
  };
}

/** Sustituye un nodo por otro dentro de su contenedor. */
function reemplazarNodo(raiz, situaciones, antiguo, nuevo) {
  const situacion = situaciones.get(antiguo);
  if (situacion === undefined || situacion.contenedor === null) {
    return nuevo;
  }

  situacion.contenedor[situacion.indice] = nuevo;
  return raiz;
}

/** Quita un nodo de su contenedor. */
function quitarNodo(raiz, situaciones, nodo) {
  const situacion = situaciones.get(nodo);
  if (situacion === undefined || situacion.contenedor === null) {
    return raiz;
  }

  situacion.contenedor.splice(situacion.indice, 1);
  return raiz;
}

/** Deja la proporción dentro de un margen para que ninguna mitad quede mínima. */
export function limitarProporcion(proporcion) {
  if (typeof proporcion !== 'number' || Number.isNaN(proporcion)) {
    return 0.5;
  }
  return Math.min(1 - PROPORCION_MINIMA, Math.max(PROPORCION_MINIMA, proporcion));
}
