// Recepción del archivo enviado en la petición multipart.
//
// Se usa multer con almacenamiento en disco para que el archivo se escriba en
// streaming en lugar de mantenerse entero en memoria.

const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');

const { DIRECTORIO_SUBIDAS } = require('../config');
const { ErrorSolicitud } = require('../errores/error-solicitud');

// El directorio se crea al cargar el módulo para que siempre exista el destino.
fs.mkdirSync(DIRECTORIO_SUBIDAS, { recursive: true });

// Longitud máxima admitida para la extensión que se conserva del nombre original.
const LONGITUD_MAXIMA_EXTENSION = 12;
const PATRON_EXTENSION = new RegExp(`^\\.[A-Za-z0-9]{1,${LONGITUD_MAXIMA_EXTENSION}}$`);

/**
 * Extrae una extensión segura del nombre original del archivo.
 * Solo se conserva si está formada por letras o dígitos precedidos de un punto.
 */
function construirExtensionSegura(nombreOriginal) {
  const extension = path.extname(nombreOriginal || '');

  return PATRON_EXTENSION.test(extension) ? extension.toLowerCase() : '';
}

const almacenamientoEnDisco = multer.diskStorage({
  destination: (peticion, archivo, continuar) => {
    continuar(null, DIRECTORIO_SUBIDAS);
  },
  filename: (peticion, archivo, continuar) => {
    // El nombre en disco es único para no sobrescribir archivos homónimos y para
    // no reutilizar un nombre controlado por el cliente.
    const marcaUnica = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    continuar(null, `${marcaUnica}${construirExtensionSegura(archivo.originalname)}`);
  }
});

const receptorSubida = multer({ storage: almacenamientoEnDisco }).single('archivo');

/**
 * Middleware que recibe el archivo y traduce los errores de multer al formato
 * de error propio de la aplicación.
 */
function recibirArchivo(peticion, respuesta, siguiente) {
  receptorSubida(peticion, respuesta, (error) => {
    if (!error) {
      siguiente();
      return;
    }

    if (error instanceof multer.MulterError) {
      siguiente(new ErrorSolicitud(`No se pudo procesar el archivo: ${error.message}`, 400));
      return;
    }

    siguiente(error);
  });
}

module.exports = { recibirArchivo, construirExtensionSegura };
