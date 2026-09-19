// Pruebas del endpoint de miembros.
//
// Se arranca la aplicación en un puerto libre y se hacen peticiones reales con
// fetch. El almacén se sustituye por uno de mentira, así que estas pruebas no
// necesitan PostgreSQL.

const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');

const { crearAplicacion } = require('../src/app');

/**
 * Almacén de mentira: guarda en memoria y no toca PostgreSQL.
 * Permite probar la API y las validaciones sin depender de una base de datos.
 */
function crearAlmacenDePrueba() {
  const miembros = [];
  let siguienteId = 1;

  return {
    async listarMiembros() {
      return [...miembros].sort((uno, otro) => uno.nombre.localeCompare(otro.nombre, 'es'));
    },
    async guardarMiembro(datos) {
      const miembro = {
        id: siguienteId,
        nombre: datos.nombre,
        nacimiento: datos.nacimiento,
        parentesco: datos.parentesco,
        telefono: datos.telefono,
        correo: datos.correo,
        notas: datos.notas,
        creado: new Date().toISOString()
      };

      siguienteId += 1;
      miembros.push(miembro);

      return miembro;
    },
    async borrarMiembro(id) {
      const posicion = miembros.findIndex((miembro) => miembro.id === id);
      if (posicion === -1) {
        return false;
      }

      miembros.splice(posicion, 1);
      return true;
    }
  };
}

let servidor = null;
let urlBase = '';

before(async () => {
  servidor = crearAplicacion({ almacenDeMiembros: crearAlmacenDePrueba() }).listen(0);
  await new Promise((resolver) => servidor.once('listening', resolver));
  urlBase = `http://127.0.0.1:${servidor.address().port}`;
});

after(async () => {
  await new Promise((resolver) => servidor.close(resolver));
});

/** Envía un miembro a la API y devuelve la respuesta tal cual. */
function enviarMiembro(datos) {
  return fetch(`${urlBase}/api/miembros`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(datos)
  });
}

test('la lista empieza vacía', async () => {
  const respuesta = await fetch(`${urlBase}/api/miembros`);

  assert.equal(respuesta.status, 200);
  assert.deepEqual(await respuesta.json(), { miembros: [] });
});

test('se puede dar de alta un miembro con todos los datos', async () => {
  const respuesta = await enviarMiembro({
    nombre: 'Lucía Gómez',
    nacimiento: '1985-04-12',
    parentesco: 'Madre',
    telefono: '600111222',
    correo: 'lucia@ejemplo.com',
    notas: 'Lleva las cuentas'
  });

  assert.equal(respuesta.status, 201);

  const miembro = await respuesta.json();
  assert.equal(miembro.nombre, 'Lucía Gómez');
  assert.equal(miembro.nacimiento, '1985-04-12');
  assert.equal(miembro.parentesco, 'Madre');
  assert.equal(miembro.correo, 'lucia@ejemplo.com');
  assert.equal(typeof miembro.id, 'number');
});

test('solo el nombre es obligatorio', async () => {
  const respuesta = await enviarMiembro({ nombre: 'Solo nombre' });

  assert.equal(respuesta.status, 201);

  const miembro = await respuesta.json();
  assert.equal(miembro.nacimiento, '');
  assert.equal(miembro.telefono, '');
  assert.equal(miembro.notas, '');
});

test('el nombre vacío se rechaza', async () => {
  const respuesta = await enviarMiembro({ nombre: '   ' });

  assert.equal(respuesta.status, 400);
  assert.deepEqual(await respuesta.json(), { error: 'El nombre es obligatorio.' });
});

test('el correo mal formado se rechaza', async () => {
  const respuesta = await enviarMiembro({ nombre: 'Ana', correo: 'ana-arroba-nada' });

  assert.equal(respuesta.status, 400);
  assert.deepEqual(await respuesta.json(), { error: 'El correo no tiene un formato válido.' });
});

test('la fecha con otro formato se rechaza', async () => {
  const respuesta = await enviarMiembro({ nombre: 'Ana', nacimiento: '12/04/1985' });

  assert.equal(respuesta.status, 400);
  assert.deepEqual(await respuesta.json(), {
    error: 'La fecha de nacimiento debe tener el formato AAAA-MM-DD.'
  });
});

test('la fecha imposible se rechaza', async () => {
  const respuesta = await enviarMiembro({ nombre: 'Ana', nacimiento: '1985-02-31' });

  assert.equal(respuesta.status, 400);
  assert.deepEqual(await respuesta.json(), {
    error: 'La fecha de nacimiento no es una fecha válida.'
  });
});

test('la fecha futura se rechaza', async () => {
  const manana = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const texto = manana.toISOString().slice(0, 10);
  const respuesta = await enviarMiembro({ nombre: 'Ana', nacimiento: texto });

  assert.equal(respuesta.status, 400);
  assert.deepEqual(await respuesta.json(), {
    error: 'La fecha de nacimiento no puede estar en el futuro.'
  });
});

test('el teléfono demasiado corto se rechaza', async () => {
  const respuesta = await enviarMiembro({ nombre: 'Ana', telefono: '123' });

  assert.equal(respuesta.status, 400);
  assert.match((await respuesta.json()).error, /entre 7 y 15 dígitos/);
});

test('la lista devuelve los miembros ordenados por nombre', async () => {
  const respuesta = await fetch(`${urlBase}/api/miembros`);
  const { miembros } = await respuesta.json();

  assert.equal(miembros.length, 2);
  assert.deepEqual(
    miembros.map((miembro) => miembro.nombre),
    ['Lucía Gómez', 'Solo nombre']
  );
});

test('se puede borrar un miembro', async () => {
  const respuestaLista = await fetch(`${urlBase}/api/miembros`);
  const { miembros } = await respuestaLista.json();
  const id = miembros[0].id;

  const respuesta = await fetch(`${urlBase}/api/miembros/${id}`, { method: 'DELETE' });
  assert.equal(respuesta.status, 200);
  assert.deepEqual(await respuesta.json(), { borrado: id });

  const respuestaFinal = await fetch(`${urlBase}/api/miembros`);
  const finales = (await respuestaFinal.json()).miembros;
  assert.equal(finales.length, 1);
  assert.equal(finales[0].id === id, false);
});

test('borrar un miembro que no existe responde 404', async () => {
  const respuesta = await fetch(`${urlBase}/api/miembros/9999`, { method: 'DELETE' });

  assert.equal(respuesta.status, 404);
  assert.deepEqual(await respuesta.json(), { error: 'El miembro indicado no existe.' });
});

test('un identificador que no es un número responde 400', async () => {
  const respuesta = await fetch(`${urlBase}/api/miembros/abc`, { method: 'DELETE' });

  assert.equal(respuesta.status, 400);
  assert.deepEqual(await respuesta.json(), { error: 'El identificador del miembro no es válido.' });
});
