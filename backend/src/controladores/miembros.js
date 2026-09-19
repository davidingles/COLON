// Controlador de los miembros de la familia.

const { ErrorSolicitud } = require('../errores/error-solicitud');
const { validarMiembro, validarIdentificador } = require('../validaciones/miembro');

/**
 * Normaliza un campo de texto del cuerpo de la petición.
 * Si el campo llega con otro tipo (número, objeto, array) se trata como vacío.
 */
function leerCampoDeTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

/**
 * GET /api/miembros
 * Devuelve { miembros: [...] }, ordenados por nombre.
 */
async function listarMiembros(peticion, respuesta, siguiente) {
  try {
    const miembros = await peticion.app.locals.almacenMiembros.listarMiembros();
    respuesta.json({ miembros });
  } catch (error) {
    siguiente(error);
  }
}

/**
 * POST /api/miembros
 * Recibe los datos de un miembro en JSON. Solo el nombre es obligatorio.
 */
async function registrarMiembro(peticion, respuesta, siguiente) {
  try {
    const cuerpo = peticion.body ?? {};

    const datos = {
      nombre: leerCampoDeTexto(cuerpo.nombre),
      nacimiento: leerCampoDeTexto(cuerpo.nacimiento),
      parentesco: leerCampoDeTexto(cuerpo.parentesco),
      telefono: leerCampoDeTexto(cuerpo.telefono),
      correo: leerCampoDeTexto(cuerpo.correo),
      notas: leerCampoDeTexto(cuerpo.notas)
    };

    validarMiembro(datos);

    const miembro = await peticion.app.locals.almacenMiembros.guardarMiembro(datos);
    respuesta.status(201).json(miembro);
  } catch (error) {
    siguiente(error);
  }
}

/**
 * DELETE /api/miembros/:id
 * Borra el miembro indicado. Responde 404 si no existía.
 *
 * Devuelve 200 con un cuerpo JSON pequeño en vez de 204 sin cuerpo: el proxy del
 * frontend no se lleva bien con las respuestas vacías y el navegador las marca
 * como petición abortada.
 */
async function borrarMiembro(peticion, respuesta, siguiente) {
  try {
    const id = validarIdentificador(peticion.params.id);
    const borrado = await peticion.app.locals.almacenMiembros.borrarMiembro(id);

    if (!borrado) {
      throw new ErrorSolicitud('El miembro indicado no existe.', 404);
    }

    respuesta.json({ borrado: id });
  } catch (error) {
    siguiente(error);
  }
}

module.exports = { listarMiembros, registrarMiembro, borrarMiembro };
