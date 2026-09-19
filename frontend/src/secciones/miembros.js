// Miembros de la familia: lectura, alta y baja contra la API.
//
// Los datos viven en PostgreSQL. Esta es la única capa que habla con el
// backend: las vistas piden la lista y se suscriben a los cambios.

import { peticion, peticionJson, RUTA_MIEMBROS } from '../api.js';

// Clave con la que guardaba los miembros la versión anterior, que los tenía solo
// en el navegador. Se usa una vez, para pasarlos a la base de datos.
const CLAVE_ANTIGUA = 'pwa-tareas-03:miembros';

// Lista conocida, si está cargando y el último error. Las vistas leen de aquí
// para poder pintarse al momento, sin esperar a la red.
let estado = { cargando: true, error: null, lista: [] };

// La migración de los miembros antiguos se intenta una sola vez por sesión.
let migracionHecha = false;

// Funciones a las que avisar cuando cambie algo, para que las vistas que estén
// abiertas se enteren sin tener que recargar nada.
const suscriptores = new Set();

/**
 * Avisa cuando cambia la lista o su estado de carga.
 * Devuelve la función para darse de baja.
 */
export function alCambiarMiembros(funcion) {
  suscriptores.add(funcion);

  return () => suscriptores.delete(funcion);
}

function avisarCambio() {
  for (const funcion of suscriptores) {
    funcion();
  }
}

/** Devuelve el estado actual: la lista, si carga y el último error. */
export function estadoDeMiembros() {
  return estado;
}

/** Devuelve los miembros que se conocen ahora mismo, sin esperar a la red. */
export function leerMiembros() {
  return estado.lista;
}

/** Pide la lista al servidor y avisa a las vistas. */
export async function cargarMiembros() {
  estado = { ...estado, cargando: true, error: null };
  avisarCambio();

  try {
    let lista = await pedirLista();

    // Una sola vez: los miembros que quedaran en el navegador se pasan a la base
    // de datos y se vacía el almacén local.
    if (!migracionHecha) {
      migracionHecha = true;

      if (await pasarAntiguosALaBase(lista)) {
        lista = await pedirLista();
      }
    }

    estado = { cargando: false, error: null, lista };
  } catch (error) {
    // Sin servidor no hay datos que enseñar: se avisa en vez de mentir con una
    // lista vacía, que parecería que no hay ningún miembro.
    estado = { cargando: false, error: error.message, lista: [] };
  }

  avisarCambio();
}

/** Añade un miembro y devuelve el que se ha guardado. */
export async function guardarMiembro(datos) {
  const miembro = await peticionJson(RUTA_MIEMBROS, 'POST', datos);

  await cargarMiembros();
  return miembro;
}

/** Borra el miembro indicado. */
export async function borrarMiembro(id) {
  await peticion(`${RUTA_MIEMBROS}/${id}`, { method: 'DELETE' });

  await cargarMiembros();
}

/** Pide la lista al servidor ya normalizada. */
async function pedirLista() {
  const respuesta = await peticion(RUTA_MIEMBROS);
  const lista = respuesta === null ? [] : respuesta.miembros;

  return Array.isArray(lista) ? lista.map(normalizarMiembro) : [];
}

/**
 * Pasa a la base de datos los miembros que la versión anterior guardaba en el
 * navegador y vacía ese almacén.
 *
 * Comprueba antes si ya existe uno con el mismo nombre y fecha, para que
 * repetirlo no duplique nada. Devuelve true si ha añadido alguno.
 */
async function pasarAntiguosALaBase(listaActual) {
  const antiguos = leerAntiguos();
  if (antiguos.length === 0) {
    return false;
  }

  let anadidos = 0;

  for (const antiguo of antiguos) {
    const yaEsta = listaActual.some(
      (miembro) => miembro.nombre === antiguo.nombre && miembro.nacimiento === antiguo.nacimiento
    );

    if (yaEsta) {
      continue;
    }

    await peticionJson(RUTA_MIEMBROS, 'POST', antiguo);
    anadidos += 1;
  }

  localStorage.removeItem(CLAVE_ANTIGUA);
  return anadidos > 0;
}

/** Lee los miembros del formato antiguo, del almacén del navegador. */
function leerAntiguos() {
  let texto;
  try {
    texto = localStorage.getItem(CLAVE_ANTIGUA);
  } catch {
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
    .filter((miembro) => esObjeto(miembro) && typeof miembro.nombre === 'string')
    .map(normalizarMiembro);
}

/** Se asegura de que todos los campos sean del tipo que esperan las vistas. */
function normalizarMiembro(valor) {
  const miembro = esObjeto(valor) ? valor : {};

  return {
    id: miembro.id,
    nombre: texto(miembro.nombre),
    nacimiento: texto(miembro.nacimiento),
    parentesco: texto(miembro.parentesco),
    telefono: texto(miembro.telefono),
    correo: texto(miembro.correo),
    notas: texto(miembro.notas)
  };
}

/**
 * Filtra los miembros por un texto.
 *
 * Se busca en el nombre, el parentesco y los datos de contacto, sin distinguir
 * mayúsculas ni acentos.
 */
export function filtrarMiembros(miembros, texto) {
  const buscado = normalizar(texto);
  if (buscado === '') {
    return miembros;
  }

  return miembros.filter((miembro) =>
    [miembro.nombre, miembro.parentesco, miembro.telefono, miembro.correo]
      .some((valor) => normalizar(valor).includes(buscado))
  );
}

/**
 * Calcula los datos que se deducen de la fecha de nacimiento de un miembro.
 *
 * `hoy` se recibe como parámetro para poder comprobarlo con fechas fijas.
 * Devuelve null si el miembro no tiene una fecha válida.
 */
export function calcularEstadisticas(miembro, hoy = new Date()) {
  const nacimiento = interpretarFecha(miembro.nacimiento);
  if (nacimiento === null) {
    return null;
  }

  const referencia = soloFecha(hoy);
  const proximo = proximoCumpleanos(nacimiento, referencia);

  return {
    nacimiento,
    edad: edadEnAnios(nacimiento, referencia),
    proximo,
    dias: Math.round((proximo - referencia) / MILISEGUNDOS_POR_DIA),
    signo: signoDelZodiaco(nacimiento)
  };
}

const MILISEGUNDOS_POR_DIA = 24 * 60 * 60 * 1000;

// Comienzo de cada signo del zodiaco, en orden de calendario.
const SIGNOS = [
  { mes: 1, dia: 20, nombre: 'Acuario' },
  { mes: 2, dia: 19, nombre: 'Piscis' },
  { mes: 3, dia: 21, nombre: 'Aries' },
  { mes: 4, dia: 20, nombre: 'Tauro' },
  { mes: 5, dia: 21, nombre: 'Géminis' },
  { mes: 6, dia: 21, nombre: 'Cáncer' },
  { mes: 7, dia: 23, nombre: 'Leo' },
  { mes: 8, dia: 23, nombre: 'Virgo' },
  { mes: 9, dia: 23, nombre: 'Libra' },
  { mes: 10, dia: 23, nombre: 'Escorpio' },
  { mes: 11, dia: 22, nombre: 'Sagitario' },
  { mes: 12, dia: 22, nombre: 'Capricornio' }
];

/**
 * Pasa un texto «AAAA-MM-DD» a una fecha local, o devuelve null si no vale.
 *
 * No se usa `new Date(texto)` a propósito: eso lo interpreta como UTC y en
 * algunos husos horarios el día baila.
 */
function interpretarFecha(valor) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(typeof valor === 'string' ? valor : '');
  if (partes === null) {
    return null;
  }

  const fecha = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

/** Deja la fecha a medianoche, para poder comparar días sin horas. */
function soloFecha(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

/** Años cumplidos. */
function edadEnAnios(nacimiento, hoy) {
  let edad = hoy.getFullYear() - nacimiento.getFullYear();

  const sinCumplir =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());

  if (sinCumplir) {
    edad -= 1;
  }

  return edad;
}

/** Fecha del próximo cumpleaños, que puede caer en el año siguiente. */
function proximoCumpleanos(nacimiento, hoy) {
  const proximo = new Date(hoy.getFullYear(), nacimiento.getMonth(), nacimiento.getDate());

  if (proximo < hoy) {
    proximo.setFullYear(hoy.getFullYear() + 1);
  }

  return proximo;
}

/** Signo del zodiaco que corresponde a una fecha. */
function signoDelZodiaco(fecha) {
  const mes = fecha.getMonth() + 1;
  const dia = fecha.getDate();

  // Recorriendo la tabla al revés, el primer signo cuyo comienzo ya ha pasado es
  // el que toca; antes del 20 de enero cae en Capricornio.
  for (let i = SIGNOS.length - 1; i >= 0; i--) {
    const signo = SIGNOS[i];

    if (mes > signo.mes || (mes === signo.mes && dia >= signo.dia)) {
      return signo.nombre;
    }
  }

  return 'Capricornio';
}

/** Deja el valor como texto recortado, o cadena vacía. */
function texto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

/** Pasa un texto a minúsculas y sin acentos, para poder comparar. */
function normalizar(valor) {
  if (typeof valor !== 'string') {
    return '';
  }

  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Indica si el valor recibido es un objeto plano, no nulo ni un array. */
function esObjeto(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}
