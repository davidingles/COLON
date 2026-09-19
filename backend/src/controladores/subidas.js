// Controlador de la subida de archivos.

const fs = require('node:fs/promises');

const { validarSubida } = require('../validaciones/subida');

/**
 * Normaliza un campo de texto del formulario.
 * Si el campo llega repetido, multer lo entrega como array: en ese caso no se
 * considera un valor válido y se trata como texto vacío.
 */
function leerCampoDeTexto(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
}

/**
 * Descarta el archivo recién guardado cuando la operación no puede completarse.
 * Evita dejar archivos huérfanos en disco si la base de datos falla.
 */
async function descartarArchivo(archivo) {
  try {
    await fs.unlink(archivo.path);
  } catch (error) {
    console.error(`No se pudo descartar el archivo ${archivo.filename}:`, error.message);
  }
}

/**
 * POST /api/subidas
 * Recibe nombre, teléfono y un único archivo en formato multipart.
 */
async function registrarSubidaDeArchivo(peticion, respuesta, siguiente) {
  try {
    const datos = {
      nombre: leerCampoDeTexto(peticion.body.nombre),
      telefono: leerCampoDeTexto(peticion.body.telefono),
      archivo: peticion.file || null
    };

    validarSubida(datos);

    try {
      const subida = await peticion.app.locals.almacenSubidas.guardarSubida(datos);
      respuesta.status(201).json(subida);
    } catch (error) {
      await descartarArchivo(datos.archivo);
      throw error;
    }
  } catch (error) {
    siguiente(error);
  }
}

/**
 * GET /api/subidas
 * Devuelve las subidas guardadas, de la más reciente a la más antigua.
 */
async function listarSubidas(peticion, respuesta, siguiente) {
  try {
    const subidas = await peticion.app.locals.almacenSubidas.listarSubidas();
    respuesta.json({ subidas });
  } catch (error) {
    siguiente(error);
  }
}

module.exports = { registrarSubidaDeArchivo, listarSubidas };
