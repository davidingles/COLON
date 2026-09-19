// Validaciones en cliente del formulario.
// Complementan, pero no sustituyen, a las validaciones que haga el backend.

export const LONGITUD_MAXIMA_NOMBRE = 120;
export const LONGITUD_MINIMA_TELEFONO = 7;
export const LONGITUD_MAXIMA_TELEFONO = 15;

// Se admite un prefijo internacional y separadores habituales.
const PATRON_TELEFONO = /^\+?[\d\s().-]+$/;

/**
 * Valida el nombre.
 * Devuelve el mensaje de error, o cadena vacía si el valor es correcto.
 */
export function validarNombre(valor) {
  if (valor === '') {
    return 'El nombre es obligatorio.';
  }
  if (valor.length > LONGITUD_MAXIMA_NOMBRE) {
    return `El nombre no puede superar los ${LONGITUD_MAXIMA_NOMBRE} caracteres.`;
  }
  return '';
}

/**
 * Valida el teléfono.
 * Devuelve el mensaje de error, o cadena vacía si el valor es correcto.
 */
export function validarTelefono(valor) {
  if (valor === '') {
    return 'El teléfono es obligatorio.';
  }
  if (!PATRON_TELEFONO.test(valor)) {
    return 'Usa solo números y los símbolos +, -, punto, paréntesis o espacio.';
  }

  const digitos = valor.replace(/\D/g, '');
  if (digitos.length < LONGITUD_MINIMA_TELEFONO || digitos.length > LONGITUD_MAXIMA_TELEFONO) {
    return `El teléfono debe tener entre ${LONGITUD_MINIMA_TELEFONO} y ${LONGITUD_MAXIMA_TELEFONO} dígitos.`;
  }
  return '';
}

/**
 * Valida el archivo seleccionado.
 * Devuelve el mensaje de error, o cadena vacía si el archivo es válido.
 */
export function validarArchivo(archivo) {
  if (!archivo) {
    return 'Selecciona un archivo.';
  }
  if (archivo.size === 0) {
    return 'El archivo seleccionado está vacío.';
  }
  return '';
}
