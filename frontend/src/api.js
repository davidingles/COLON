// Comunicación con la API HTTP del backend.
//
// Contrato esperado (pendiente de implementar en el backend):
//   POST /api/subidas
//   Content-Type: multipart/form-data
//   Campos: nombre (texto), telefono (texto), archivo (binario)
//   Respuesta correcta: código 2xx; el cuerpo puede ser JSON o estar vacío.
//
// El prefijo /api lo resuelve el proxy de vite.config.js en desarrollo.

export const RUTA_SUBIDA = '/api/subidas';

export const RUTA_MIEMBROS = '/api/miembros';

/**
 * Hace una petición a la API y devuelve el JSON de la respuesta.
 *
 * Lanza un Error con un mensaje legible: el que manda el servidor cuando lo
 * manda (el backend responde `{ error }`), o uno propio si no hay conexión.
 */
export async function peticion(ruta, opciones = {}) {
  let respuesta;

  try {
    respuesta = await fetch(ruta, opciones);
  } catch {
    throw new Error('No se pudo conectar con el servidor. ¿Está arrancado el backend?');
  }

  if (!respuesta.ok) {
    throw new Error(await leerMensajeDeError(respuesta));
  }

  if (respuesta.status === 204) {
    return null;
  }

  const tipoContenido = respuesta.headers.get('content-type') || '';
  if (!tipoContenido.includes('application/json')) {
    return null;
  }

  try {
    return await respuesta.json();
  } catch {
    throw new Error('La respuesta del servidor no es un JSON válido.');
  }
}

/** Envía un objeto como JSON y devuelve la respuesta. */
export function peticionJson(ruta, metodo, datos) {
  return peticion(ruta, {
    method: metodo,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
}

/** Saca el mensaje de error del cuerpo, o compone uno con el código HTTP. */
async function leerMensajeDeError(respuesta) {
  try {
    const cuerpo = await respuesta.json();

    if (typeof cuerpo.error === 'string' && cuerpo.error !== '') {
      return cuerpo.error;
    }
  } catch {
    // Si el cuerpo no es JSON se mira el código HTTP.
  }

  // Un 502 o un 504 los pone el proxy de desarrollo cuando no encuentra el
  // backend, así que se explica eso en vez de soltar un código HTTP a secas.
  if (respuesta.status === 502 || respuesta.status === 504) {
    return 'No se pudo conectar con el servidor. ¿Está arrancado el backend?';
  }

  return `El servidor ha respondido con el código HTTP ${respuesta.status}.`;
}

/**
 * Envía los datos del formulario al backend en una única petición multipart.
 * Lanza un Error con un mensaje legible si la petición falla.
 */
export async function enviarFormulario({ nombre, telefono, archivo }) {
  const datos = new FormData();
  datos.append('nombre', nombre);
  datos.append('telefono', telefono);
  datos.append('archivo', archivo);

  let respuesta;
  try {
    respuesta = await fetch(RUTA_SUBIDA, { method: 'POST', body: datos });
  } catch {
    throw new Error('No se pudo conectar con el servidor. ¿Está arrancado el backend?');
  }

  if (!respuesta.ok) {
    throw new Error(`El servidor ha respondido con el código HTTP ${respuesta.status}.`);
  }

  const tipoContenido = respuesta.headers.get('content-type') || '';
  if (!tipoContenido.includes('application/json')) {
    return null;
  }

  try {
    return await respuesta.json();
  } catch {
    throw new Error('La respuesta del servidor no es un JSON válido.');
  }
}
