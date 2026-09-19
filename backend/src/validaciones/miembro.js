// Validaciones de los datos recibidos al dar de alta un miembro.
//
// Cada función lanza un ErrorSolicitud con código 400 si el dato no es válido,
// de modo que el manejador de errores de la aplicación construye la respuesta.
// Estas comprobaciones replican las del frontend, que no son de fiar por sí
// solas porque el navegador se puede saltar.

const { ErrorSolicitud } = require('../errores/error-solicitud');

const LONGITUD_MAXIMA_NOMBRE = 120;
const LONGITUD_MAXIMA_TEXTO = 200;
const LONGITUD_MAXIMA_NOTAS = 2000;

const LONGITUD_MINIMA_TELEFONO = 7;
const LONGITUD_MAXIMA_TELEFONO = 15;

// Mismos patrones que en las subidas: prefijo internacional y separadores
// habituales en el teléfono, y forma básica de correo.
const PATRON_TELEFONO = /^\+?[\d\s().-]+$/;
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Solo el nombre es obligatorio: el resto de campos pueden venir vacíos. */
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

/** La fecha es opcional, pero si viene tiene que ser una fecha real. */
function validarNacimiento(nacimiento) {
  if (nacimiento === '') {
    return;
  }

  if (!PATRON_FECHA.test(nacimiento)) {
    throw new ErrorSolicitud('La fecha de nacimiento debe tener el formato AAAA-MM-DD.', 400);
  }

  const [anio, mes, dia] = nacimiento.split('-').map(Number);
  const fecha = new Date(anio, mes - 1, dia);
  const esReal =
    fecha.getFullYear() === anio && fecha.getMonth() === mes - 1 && fecha.getDate() === dia;

  if (!esReal) {
    throw new ErrorSolicitud('La fecha de nacimiento no es una fecha válida.', 400);
  }

  if (fecha > new Date()) {
    throw new ErrorSolicitud('La fecha de nacimiento no puede estar en el futuro.', 400);
  }
}

/** El teléfono es opcional; si viene, se comprueba igual que en las subidas. */
function validarTelefono(telefono) {
  if (telefono === '') {
    return;
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

/** El correo es opcional. */
function validarCorreo(correo) {
  if (correo === '') {
    return;
  }

  if (!PATRON_CORREO.test(correo)) {
    throw new ErrorSolicitud('El correo no tiene un formato válido.', 400);
  }

  if (correo.length > LONGITUD_MAXIMA_TEXTO) {
    throw new ErrorSolicitud(
      `El correo no puede superar los ${LONGITUD_MAXIMA_TEXTO} caracteres.`,
      400
    );
  }
}

function validarParentesco(parentesco) {
  if (parentesco.length > LONGITUD_MAXIMA_TEXTO) {
    throw new ErrorSolicitud(
      `El parentesco no puede superar los ${LONGITUD_MAXIMA_TEXTO} caracteres.`,
      400
    );
  }
}

function validarNotas(notas) {
  if (notas.length > LONGITUD_MAXIMA_NOTAS) {
    throw new ErrorSolicitud(`Las notas no pueden superar los ${LONGITUD_MAXIMA_NOTAS} caracteres.`, 400);
  }
}

/** Comprueba todos los campos de un miembro. */
function validarMiembro(datos) {
  validarNombre(datos.nombre);
  validarNacimiento(datos.nacimiento);
  validarParentesco(datos.parentesco);
  validarTelefono(datos.telefono);
  validarCorreo(datos.correo);
  validarNotas(datos.notas);
}

/** Comprueba el identificador que llega en la ruta y lo devuelve como número. */
function validarIdentificador(valor) {
  if (!/^\d+$/.test(typeof valor === 'string' ? valor : '')) {
    throw new ErrorSolicitud('El identificador del miembro no es válido.', 400);
  }

  const id = Number(valor);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new ErrorSolicitud('El identificador del miembro no es válido.', 400);
  }

  return id;
}

module.exports = { validarMiembro, validarIdentificador };
