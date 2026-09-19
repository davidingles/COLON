// Arranque del servidor HTTP.

const { crearAplicacion } = require('./app');
const { PUERTO, DIRECTORIO_SUBIDAS } = require('./config');
const { comprobarConexion, cerrarConexion, describirDestino } = require('./servicios/conexion');

const aplicacion = crearAplicacion();

const servidor = aplicacion.listen(PUERTO, () => {
  mostrarInformacionDeArranque();
});

/**
 * Informa del destino de los datos y avisa si la base de datos no responde.
 * El servidor arranca igualmente: es más cómodo trabajar así.
 */
async function mostrarInformacionDeArranque() {
  console.log(`Backend escuchando en http://localhost:${PUERTO}`);
  console.log(`Directorio de subidas: ${DIRECTORIO_SUBIDAS}`);
  console.log(`Base de datos: ${describirDestino()}`);

  const problema = await comprobarConexion();

  if (problema) {
    console.warn(`Aviso: la base de datos no responde. ${problema}`);
    console.warn('Las peticiones que necesiten datos fallarán hasta que esté disponible.');
    return;
  }

  console.log('Conexión con la base de datos correcta.');
}

// Cierre ordenado para liberar el puerto y las conexiones al detener el proceso.
function cerrarServidor(senal) {
  console.log(`\nSeñal ${senal} recibida. Cerrando el servidor...`);

  servidor.close(() => {
    cerrarConexion()
      .catch((error) => console.error('Error al cerrar la base de datos:', error.message))
      .finally(() => process.exit(0));
  });
}

process.on('SIGINT', () => cerrarServidor('SIGINT'));
process.on('SIGTERM', () => cerrarServidor('SIGTERM'));
