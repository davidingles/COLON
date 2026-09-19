// Pruebas del endpoint de subida.
//
// Se arranca la aplicación en un puerto libre y se hacen peticiones reales con
// fetch. El directorio de subidas se redirige a una carpeta temporal antes de
// cargar la configuración, para no escribir en las subidas reales.

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const PREFIJO_DIRECTORIO_TEMPORAL = 'subidas-prueba-';
const DIRECTORIO_TEMPORAL = path.join(
  os.tmpdir(),
  `${PREFIJO_DIRECTORIO_TEMPORAL}${Date.now()}`
);

process.env.DIRECTORIO_SUBIDAS = DIRECTORIO_TEMPORAL;

const { crearAplicacion } = require('../src/app');
const { construirExtensionSegura } = require('../src/middleware/subida-archivo');

/**
 * Almacén de mentira: guarda en memoria y no toca PostgreSQL.
 * Permite probar la API y las validaciones sin depender de una base de datos.
 */
function crearAlmacenDePrueba() {
  const subidas = [];
  let siguienteId = 1;

  return {
    async guardarSubida({ nombre, telefono, archivo }) {
      const subida = {
        id: siguienteId,
        nombre,
        telefono,
        archivo: {
          nombreOriginal: archivo.originalname,
          nombreGuardado: archivo.filename,
          tipoContenido: archivo.mimetype,
          tamano: archivo.size
        },
        fecha: new Date().toISOString()
      };

      siguienteId += 1;
      subidas.push(subida);

      return subida;
    },
    async listarSubidas() {
      return [...subidas];
    }
  };
}

let servidor = null;
let urlBase = '';

before(async () => {
  servidor = crearAplicacion({ almacenDeSubidas: crearAlmacenDePrueba() }).listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  urlBase = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
  await new Promise((resolver) => servidor.close(resolver));

  // Salvaguarda: solo se borra si la ruta es realmente la carpeta temporal creada por esta prueba.
  const esCarpetaDePrueba = path
    .basename(DIRECTORIO_TEMPORAL)
    .startsWith(PREFIJO_DIRECTORIO_TEMPORAL);

  if (esCarpetaDePrueba) {
    await fs.rm(DIRECTORIO_TEMPORAL, { recursive: true, force: true });
  }
});

/** Construye el cuerpo multipart de una subida. Los campos omitidos no se envían. */
function crearCuerpo({ nombre, telefono, contenido, nombreArchivo }) {
  const datos = new FormData();

  if (nombre !== undefined) {
    datos.append('nombre', nombre);
  }
  if (telefono !== undefined) {
    datos.append('telefono', telefono);
  }
  if (contenido !== undefined) {
    datos.append('archivo', new Blob([contenido], { type: 'text/plain' }), nombreArchivo);
  }

  return datos;
}

/** Envía una subida al endpoint y devuelve la respuesta. */
function enviarSubida(cuerpo) {
  return fetch(`${urlBase}/api/subidas`, { method: 'POST', body: cuerpo });
}

test('una subida válida guarda el archivo y responde 201', async () => {
  const contenido = 'contenido de prueba';

  const respuesta = await enviarSubida(
    crearCuerpo({
      nombre: 'Ana Pérez',
      telefono: '+34 600 123 456',
      contenido,
      nombreArchivo: 'nota.txt'
    })
  );

  assert.equal(respuesta.status, 201);

  const subida = await respuesta.json();
  assert.equal(subida.nombre, 'Ana Pérez');
  assert.equal(subida.telefono, '+34 600 123 456');
  assert.equal(subida.archivo.nombreOriginal, 'nota.txt');
  assert.equal(subida.archivo.tamano, contenido.length);
  assert.match(subida.archivo.nombreGuardado, /^\d+-\d+\.txt$/);

  const rutaGuardada = path.join(DIRECTORIO_TEMPORAL, subida.archivo.nombreGuardado);
  const contenidoGuardado = await fs.readFile(rutaGuardada, 'utf8');
  assert.equal(contenidoGuardado, contenido);
});

test('rechaza la subida sin nombre con 400', async () => {
  const respuesta = await enviarSubida(
    crearCuerpo({ telefono: '600123456', contenido: 'x', nombreArchivo: 'nota.txt' })
  );

  assert.equal(respuesta.status, 400);
  assert.equal((await respuesta.json()).error, 'El nombre es obligatorio.');
});

test('rechaza la subida con teléfono inválido con 400', async () => {
  const respuesta = await enviarSubida(
    crearCuerpo({ nombre: 'Ana', telefono: 'abc', contenido: 'x', nombreArchivo: 'nota.txt' })
  );

  assert.equal(respuesta.status, 400);
  assert.match((await respuesta.json()).error, /solo admite números/);
});

test('rechaza la subida con teléfono demasiado corto con 400', async () => {
  const respuesta = await enviarSubida(
    crearCuerpo({ nombre: 'Ana', telefono: '12345', contenido: 'x', nombreArchivo: 'nota.txt' })
  );

  assert.equal(respuesta.status, 400);
  assert.match((await respuesta.json()).error, /entre 7 y 15 dígitos/);
});

test('rechaza la subida sin archivo con 400', async () => {
  const respuesta = await enviarSubida(
    crearCuerpo({ nombre: 'Ana', telefono: '600123456' })
  );

  assert.equal(respuesta.status, 400);
  assert.equal((await respuesta.json()).error, 'El archivo es obligatorio.');
});

test('responde 404 en una ruta desconocida', async () => {
  const respuesta = await fetch(`${urlBase}/api/desconocida`);

  assert.equal(respuesta.status, 404);
  assert.equal((await respuesta.json()).error, 'Ruta no encontrada.');
});

test('devuelve las subidas guardadas en el listado', async () => {
  await enviarSubida(
    crearCuerpo({
      nombre: 'Carlos Vega',
      telefono: '600111222',
      contenido: 'x',
      nombreArchivo: 'listado.txt'
    })
  );

  const respuesta = await fetch(`${urlBase}/api/subidas`);

  assert.equal(respuesta.status, 200);

  const cuerpo = await respuesta.json();
  assert.ok(Array.isArray(cuerpo.subidas));
  assert.ok(cuerpo.subidas.some((subida) => subida.nombre === 'Carlos Vega'));
});

test('la extensión guardada se limita a letras y dígitos', () => {
  assert.equal(construirExtensionSegura('informe.pdf'), '.pdf');
  assert.equal(construirExtensionSegura('FOTO.JPG'), '.jpg');
  assert.equal(construirExtensionSegura('archivo'), '');
  assert.equal(construirExtensionSegura('archivo.extensiondemasiadolarga'), '');
  assert.equal(construirExtensionSegura('archivo.p h p'), '');
});
