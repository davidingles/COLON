// Validaciones de los datos recibidos en una subida.
//
// Cada función lanza un ErrorSolicitud con código 400 si el dato no es válido,
// de modo que el manejador de errores de la aplicación construye la respuesta.
// Estas comprobaciones replican las del frontend, que no son de fiar por sí
// solas porque el navegador se puede saltar.

const { ErrorSolicitud } = require('../errores/error-solicitud');

const LONGITUD_MAXIMA_NOMBRE = 120;
const LONGITUD_MINIMA_TELEFONO = 7;
const LONGITUD_MAXIMA_TELEFONO = 15;

// Se admite un prefijo internacional y separadores habituales.
const PATRON_TELEFONO = /^\+?[\d\s().-]+$/;

function validarNombre(nombre) {
  if (nombre === '') {
    throw new ErrorSolicitud('El nombre es obligatorio.', 400);
  }
  if (nombre.length > LONGITUD_MAXIMA_NOMBRE) {
    throw new ErrorSolicitud(
      `El nombre no puede superar los ${LONGITUD_MAXIMA_NOMBRE} caracteres.`,
      400
    );
  }
}

function validarTelefono(telefono) {
  if (telefono === '') {
    throw new ErrorSolicitud('El teléfono es obligatorio.', 400);
  }
  if (!PATRON_TELEFONO.test(telefono)) {
    throw new ErrorSolicitud(
      'El teléfono solo admite números y los símbolos +, -, punto, paréntesis o espacio.',
      400
    );
  }

  const digitos = telefono.replace(/\D/g, '');
  const longitudValida =
    digitos.length >= LONGITUD_MINIMA_TELEFONO && digitos.length <= LONGITUD_MAXIMA_TELEFONO;

  if (!longitudValida) {
    throw new ErrorSolicitud(
      `El teléfono debe tener entre ${LONGITUD_MINIMA_TELEFONO} y ${LONGITUD_MAXIMA_TELEFONO} dígitos.`,
      400
    );
  }
}

// No se aplican límites de tamaño ni de tipo de archivo: es la configuración
// elegida para el proyecto. La comprobación se limita a exigir que llegue algo.
function validarArchivo(archivo) {
  if (!archivo) {
    throw new ErrorSolicitud('El archivo es obligatorio.', 400);
  }
}

/**
 * Valida el conjunto de datos de una subida.
 * Lanza ErrorSolicitud con el primer problema encontrado.
 */
function validarSubida({ nombre, telefono, archivo }) {
  validarNombre(nombre);
  validarTelefono(telefono);
  validarArchivo(archivo);
}

module.exports = {
  LONGITUD_MAXIMA_NOMBRE,
  LONGITUD_MINIMA_TELEFONO,
  LONGITUD_MAXIMA_TELEFONO,
  validarSubida
};
