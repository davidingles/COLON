// Conexión con PostgreSQL.
//
// El pool toma la configuración de las variables estándar de PostgreSQL
// (PGHOST, PGPORT, PGDATABASE, PGUSER y PGPASSWORD), así que no hay ninguna
// credencial escrita en el código. Se cargan con `node --env-file=.env`.

const { Pool } = require('pg');

const TIEMPO_MAXIMO_DE_CONEXION_MS = 5000;
const TIEMPO_MAXIMO_INACTIVO_MS = 30000;
const MAXIMO_CLIENTES = 10;

const pool = new Pool({
  application_name: 'pwa-tareas-03-backend',
  connectionTimeoutMillis: TIEMPO_MAXIMO_DE_CONEXION_MS,
  idleTimeoutMillis: TIEMPO_MAXIMO_INACTIVO_MS,
  max: MAXIMO_CLIENTES
});

// Un error en un cliente que estaba inactivo no debe tumbar el proceso.
pool.on('error', (error) => {
  console.error('Error en un cliente inactivo de la base de datos:', error.message);
});

/**
 * Comprueba que se puede consultar la base de datos.
 * Devuelve null si va bien, o el mensaje del error si falla.
 */
async function comprobarConexion() {
  try {
    await pool.query('SELECT 1');
    return null;
  } catch (error) {
    return error.message;
  }
}

/** Cierra todas las conexiones. Se usa al detener el servidor. */
function cerrarConexion() {
  return pool.end();
}

/** Describe el destino de la conexión sin incluir credenciales. */
function describirDestino() {
  const host = process.env.PGHOST || 'localhost';
  const puerto = process.env.PGPORT || '5432';
  const base = process.env.PGDATABASE || '(sin PGDATABASE)';
  const usuario = process.env.PGUSER || '(sin PGUSER)';

  return `${usuario}@${host}:${puerto}/${base}`;
}

module.exports = { pool, comprobarConexion, cerrarConexion, describirDestino };
