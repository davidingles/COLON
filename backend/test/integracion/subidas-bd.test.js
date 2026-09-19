// Pruebas de integración contra PostgreSQL.
//
// A diferencia de las pruebas de test/, estas sí hablan con la base de datos y
// comprueban la SQL real: los índices, las restricciones y los tipos que
// devuelve el driver. Usan la base de pruebas, nunca la de desarrollo.

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const NOMBRE_BASE_DE_PRUEBAS = 'pwa_tareas_03_pruebas';
const PREFIJO_DIRECTORIO_TEMPORAL = 'subidas-integracion-';
const DIRECTORIO_TEMPORAL = path.join(
  os.tmpdir(),
  `${PREFIJO_DIRECTORIO_TEMPORAL}${Date.now()}`
);

// La configuración se lee del entorno al cargar los módulos, así que el destino
// de datos y la carpeta de subidas deben quedar fijados antes de esos require.
process.env.PGDATABASE = NOMBRE_BASE_DE_PRUEBAS;
process.env.DIRECTORIO_SUBIDAS = DIRECTORIO_TEMPORAL;

const { crearAplicacion } = require('../../src/app');
const { pool, cerrarConexion } = require('../../src/servicios/conexion');
const { DIRECTORIO_SUBIDAS } = require('../../src/config');

// Datos propios de esta prueba, para poder borrar después solo lo que crea.
const NOMBRE_CONTACTO = 'Contacto de prueba (integración)';
const TELEFONO_CONTACTO = '600 000 001';

let servidor = null;
let urlBase = '';

/** Comprueba que la base de pruebas tiene el esquema aplicado. */
async function comprobarEsquema() {
  const resultado = await pool.query(`
    SELECT count(*)::int AS total
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('contactos', 'archivos')
  `);

  if (resultado.rows[0].total !== 2) {
    throw new Error(
      'La base de pruebas no tiene el esquema aplicado. Ejecuta antes:\n' +
        `  .\\database\\migraciones\\aplicar.ps1 -BaseDeDatos ${NOMBRE_BASE_DE_PRUEBAS}`
    );
  }
}

/** Elimina los archivos en disco y las filas creadas por esta prueba. */
async function limpiarDatosDePrueba() {
  const archivos = await pool.query(
    `SELECT archivo.nombre_guardado
     FROM archivos AS archivo
     JOIN contactos AS contacto ON contacto.id = archivo.contacto_id
     WHERE contacto.nombre = $1 AND contacto.telefono = $2`,
    [NOMBRE_CONTACTO, TELEFONO_CONTACTO]
  );

  for (const fila of archivos.rows) {
    await fs.rm(path.join(DIRECTORIO_SUBIDAS, fila.nombre_guardado), { force: true });
  }

  // Al borrar el contacto, sus archivos caen por la clave ajena en cascada.
  await pool.query('DELETE FROM contactos WHERE nombre = $1 AND telefono = $2', [
    NOMBRE_CONTACTO,
    TELEFONO_CONTACTO
  ]);
}

/** Envía una subida de prueba al endpoint. */
function enviarSubida(nombreArchivo) {
  const datos = new FormData();
  datos.append('nombre', NOMBRE_CONTACTO);
  datos.append('telefono', TELEFONO_CONTACTO);
  datos.append(
    'archivo',
    new Blob(['contenido de integración'], { type: 'text/plain' }),
    nombreArchivo
  );

  return fetch(`${urlBase}/api/subidas`, { method: 'POST', body: datos });
}

before(async () => {
  await comprobarEsquema();
  await limpiarDatosDePrueba();

  servidor = crearAplicacion().listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));

  urlBase = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
  await limpiarDatosDePrueba();
  await new Promise((resolver) => servidor.close(resolver));
  await cerrarConexion();

  // Salvaguarda: solo se borra la carpeta temporal creada por esta prueba.
  if (path.basename(DIRECTORIO_TEMPORAL).startsWith(PREFIJO_DIRECTORIO_TEMPORAL)) {
    await fs.rm(DIRECTORIO_TEMPORAL, { recursive: true, force: true });
  }
});

test('guarda la subida y devuelve los números como números', async () => {
  const respuesta = await enviarSubida('integracion-1.txt');

  assert.equal(respuesta.status, 201);

  const subida = await respuesta.json();

  // El driver devuelve los bigint como texto si no se convierten.
  assert.equal(typeof subida.id, 'number');
  assert.equal(typeof subida.archivo.tamano, 'number');

  const filas = await pool.query(
    'SELECT nombre_original FROM archivos WHERE nombre_guardado = $1',
    [subida.archivo.nombreGuardado]
  );

  assert.equal(filas.rowCount, 1);
  assert.equal(filas.rows[0].nombre_original, 'integracion-1.txt');
});

test('reutiliza el contacto cuando se repiten nombre y teléfono', async () => {
  await enviarSubida('integracion-2.txt');

  const resultado = await pool.query(
    'SELECT count(*)::int AS total FROM contactos WHERE nombre = $1 AND telefono = $2',
    [NOMBRE_CONTACTO, TELEFONO_CONTACTO]
  );

  assert.equal(resultado.rows[0].total, 1);
});

test('lista las subidas guardadas', async () => {
  await enviarSubida('integracion-3.txt');

  const respuesta = await fetch(`${urlBase}/api/subidas`);

  assert.equal(respuesta.status, 200);

  const cuerpo = await respuesta.json();

  assert.ok(Array.isArray(cuerpo.subidas));
  assert.ok(cuerpo.subidas.some((subida) => subida.nombre === NOMBRE_CONTACTO));
});

test('rechaza el nombre de archivo guardado duplicado', async () => {
  const respuesta = await enviarSubida('integracion-duplicado.txt');
  const subida = await respuesta.json();

  // Se compara por código SQLSTATE (23505 = violación de unicidad) y no por el
  // texto del mensaje, que PostgreSQL traduce según el idioma del servidor.
  await assert.rejects(
    pool.query(
      `INSERT INTO archivos (contacto_id, nombre_original, nombre_guardado, tipo_contenido, tamano)
       SELECT contacto.id, $1, $2, 'text/plain', 1
       FROM contactos AS contacto
       WHERE contacto.nombre = $3 AND contacto.telefono = $4`,
      ['otro.txt', subida.archivo.nombreGuardado, NOMBRE_CONTACTO, TELEFONO_CONTACTO]
    ),
    { code: '23505', constraint: 'archivos_nombre_guardado_unico' }
  );
});
