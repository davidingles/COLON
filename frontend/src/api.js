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
