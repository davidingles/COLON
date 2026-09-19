// Configuración del backend.
// Los valores se obtienen del entorno; los de este archivo son solo los usados
// cuando la variable correspondiente no está definida.

const path = require('node:path');

// Raíz del área de backend: sirve para que las rutas no dependan del directorio
// de trabajo desde el que se arranque el proceso.
const RAIZ_BACKEND = path.resolve(__dirname, '..');

const PUERTO_POR_DEFECTO = 3000;
const NOMBRE_DIRECTORIO_SUBIDAS_POR_DEFECTO = 'subidas';

/**
 * Convierte el valor de PORT en un número de puerto válido.
 * Si el valor no es válido se usa el puerto por defecto.
 */
function leerPuerto(valor) {
  if (valor === undefined || valor === null || valor === '') {
    return PUERTO_POR_DEFECTO;
  }

  const puerto = Number.parseInt(valor, 10);
  const esValido = Number.isInteger(puerto) && puerto > 0 && puerto < 65536;

  return esValido ? puerto : PUERTO_POR_DEFECTO;
}

/**
 * Resuelve el directorio de subidas.
 * Un valor absoluto se respeta tal cual; uno relativo se resuelve respecto a
 * la raíz de backend/.
 */
function leerDirectorioSubidas(valor) {
  if (valor === undefined || valor === null || valor === '') {
    return path.join(RAIZ_BACKEND, NOMBRE_DIRECTORIO_SUBIDAS_POR_DEFECTO);
  }

  return path.resolve(RAIZ_BACKEND, valor);
}

module.exports = {
  PUERTO: leerPuerto(process.env.PORT),
  DIRECTORIO_SUBIDAS: leerDirectorioSubidas(process.env.DIRECTORIO_SUBIDAS)
};
