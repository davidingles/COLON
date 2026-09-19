// Construcción de la aplicación Express.

const express = require('express');

const { enrutadorSubidas } = require('./rutas/subidas');
const { enrutadorMiembros } = require('./rutas/miembros');
const { ErrorSolicitud } = require('./errores/error-solicitud');
const almacenSubidas = require('./servicios/almacen-subidas');
const almacenMiembros = require('./servicios/almacen-miembros');

// Códigos de PostgreSQL y de red que significan "no se pudo llegar a los datos".
// Se responden como 503 para distinguirlos de un fallo de programación.
const CODIGOS_SIN_DATOS = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  '28P01', // contraseña incorrecta
  '3D000', // la base de datos no existe
  '57P03', // el servidor no admite conexiones
  '53300' // demasiadas conexiones
]);

function esErrorDeDatos(error) {
  return typeof error.code === 'string' && CODIGOS_SIN_DATOS.has(error.code);
}

/**
 * Crea la aplicación Express con las rutas y el manejo de errores configurados.
 * No abre el puerto: de eso se encarga src/servidor.js o la prueba que lo use.
 *
 * El almacén de subidas se puede sustituir para probar la API sin base de datos.
 */
function crearAplicacion({ almacenDeSubidas = almacenSubidas, almacenDeMiembros = almacenMiembros } = {}) {
  const aplicacion = express();

  // Los controladores leen los almacenes desde aquí, así no dependen de la
  // implementación real.
  aplicacion.locals.almacenSubidas = almacenDeSubidas;
  aplicacion.locals.almacenMiembros = almacenDeMiembros;

  // El archivo de la subida lo procesa multer, no este analizador.
  aplicacion.use(express.json({ limit: '1mb' }));

  aplicacion.use('/api', enrutadorSubidas);
  aplicacion.use('/api', enrutadorMiembros);

  // Cualquier ruta no registrada responde 404 en JSON.
  aplicacion.use((peticion, respuesta) => {
    respuesta.status(404).json({ error: 'Ruta no encontrada.' });
  });

  // Manejador de errores. Express lo reconoce por sus cuatro parámetros, aunque
  // "siguiente" no se utilice.
  // eslint-disable-next-line no-unused-vars
  aplicacion.use((error, peticion, respuesta, siguiente) => {
    if (error instanceof ErrorSolicitud) {
      respuesta.status(error.codigoHttp).json({ error: error.message });
      return;
    }

    if (esErrorDeDatos(error)) {
      console.error('No se pudo acceder a la base de datos:', error.message);
      respuesta.status(503).json({ error: 'El servicio de datos no está disponible.' });
      return;
    }

    console.error('Error no controlado:', error);
    respuesta.status(500).json({ error: 'Error interno del servidor.' });
  });

  return aplicacion;
}

module.exports = { crearAplicacion };
