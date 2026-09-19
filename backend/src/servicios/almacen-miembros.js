// Acceso a los datos de los miembros de la familia.
//
// Toda la SQL de los miembros vive en este archivo: ni las rutas ni los
// controladores construyen consultas.

const { pool } = require('./conexion');

// node-postgres devuelve los bigint como texto para no perder precisión. Ni los
// identificadores de este proyecto se acercan a ese límite, así que se
// convierten a número para que el JSON sea coherente con el resto de la API.
function convertirNumero(valor) {
  return Number(valor);
}

// Campos que se devuelven siempre, ya listos para el frontend: los textos vacíos
// salen como cadena vacía y la fecha, como «AAAA-MM-DD». Así el navegador no
// tiene que distinguir entre nulo, fecha con hora y cadena.
const CAMPOS = `
  id,
  nombre,
  coalesce(to_char(nacimiento, 'YYYY-MM-DD'), '') AS nacimiento,
  coalesce(parentesco, '') AS parentesco,
  coalesce(telefono, '') AS telefono,
  coalesce(correo, '') AS correo,
  coalesce(notas, '') AS notas,
  creado_en
`;

const SQL_LISTAR = `
  SELECT ${CAMPOS}
  FROM miembros
  ORDER BY nombre, id
`;

const SQL_GUARDAR = `
  INSERT INTO miembros (nombre, nacimiento, parentesco, telefono, correo, notas)
  VALUES ($1, $2, $3, $4, $5, $6)
  RETURNING ${CAMPOS}
`;

const SQL_BORRAR = `
  DELETE FROM miembros
  WHERE id = $1
  RETURNING id
`;

/** Convierte una fila de la base de datos en la representación pública de un miembro. */
function describirMiembro(fila) {
  return {
    id: convertirNumero(fila.id),
    nombre: fila.nombre,
    nacimiento: fila.nacimiento,
    parentesco: fila.parentesco,
    telefono: fila.telefono,
    correo: fila.correo,
    notas: fila.notas,
    creado: fila.creado_en.toISOString()
  };
}

/** Un texto vacío se guarda como nulo, no como cadena vacía. */
function textoONulo(valor) {
  return typeof valor === 'string' && valor !== '' ? valor : null;
}

/** Devuelve todos los miembros, ordenados por nombre. */
async function listarMiembros() {
  const resultado = await pool.query(SQL_LISTAR);

  return resultado.rows.map(describirMiembro);
}

/** Guarda un miembro y devuelve su descripción pública. */
async function guardarMiembro({ nombre, nacimiento, parentesco, telefono, correo, notas }) {
  const resultado = await pool.query(SQL_GUARDAR, [
    nombre,
    textoONulo(nacimiento),
    textoONulo(parentesco),
    textoONulo(telefono),
    textoONulo(correo),
    textoONulo(notas)
  ]);

  return describirMiembro(resultado.rows[0]);
}

/** Borra un miembro. Devuelve false si no existía. */
async function borrarMiembro(id) {
  const resultado = await pool.query(SQL_BORRAR, [id]);

  return resultado.rowCount > 0;
}

module.exports = { listarMiembros, guardarMiembro, borrarMiembro };
