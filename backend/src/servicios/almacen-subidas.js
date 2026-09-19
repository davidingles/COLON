// Acceso a los datos de las subidas.
//
// Toda la SQL del proyecto vive en este archivo: ni las rutas ni los
// controladores construyen consultas.

const { pool } = require('./conexion');

// node-postgres devuelve los bigint como texto para no perder precisión. Ni los
// identificadores ni los tamaños de archivo de este proyecto se acercan a ese
// límite, así que se convierten a número para que el JSON sea coherente.
function convertirNumero(valor) {
  return Number(valor);
}

/** Convierte una fila de la base de datos en la representación pública de una subida. */
function describirSubida(fila) {
  return {
    id: convertirNumero(fila.id),
    nombre: fila.nombre,
    telefono: fila.telefono,
    archivo: {
      nombreOriginal: fila.nombre_original,
      nombreGuardado: fila.nombre_guardado,
      tipoContenido: fila.tipo_contenido,
      tamano: convertirNumero(fila.tamano)
    },
    fecha: fila.creado_en.toISOString()
  };
}

// Si el contacto ya existe se "actualiza" al mismo valor que tenía. Es la forma
// de que RETURNING devuelva siempre la fila, también cuando hubo conflicto.
const SQL_GUARDAR_CONTACTO = `
  INSERT INTO contactos (nombre, telefono)
  VALUES ($1, $2)
  ON CONFLICT (nombre, telefono) DO UPDATE SET telefono = EXCLUDED.telefono
  RETURNING id
`;

const SQL_GUARDAR_ARCHIVO = `
  INSERT INTO archivos (contacto_id, nombre_original, nombre_guardado, tipo_contenido, tamano)
  VALUES ($1, $2, $3, $4, $5)
  RETURNING id, nombre_original, nombre_guardado, tipo_contenido, tamano, creado_en
`;

const SQL_LISTAR_SUBIDAS = `
  SELECT archivo.id,
         archivo.nombre_original,
         archivo.nombre_guardado,
         archivo.tipo_contenido,
         archivo.tamano,
         archivo.creado_en,
         contacto.nombre,
         contacto.telefono
  FROM archivos AS archivo
  JOIN contactos AS contacto ON contacto.id = archivo.contacto_id
  ORDER BY archivo.creado_en DESC, archivo.id DESC
  LIMIT $1
`;

const LIMITE_POR_DEFECTO = 50;

/**
 * Guarda una subida y devuelve su descripción pública.
 * El contacto se reutiliza si ya existía con el mismo nombre y teléfono.
 */
async function guardarSubida({ nombre, telefono, archivo }) {
  const cliente = await pool.connect();

  try {
    await cliente.query('BEGIN');

    const resultadoContacto = await cliente.query(SQL_GUARDAR_CONTACTO, [nombre, telefono]);

    const resultadoArchivo = await cliente.query(SQL_GUARDAR_ARCHIVO, [
      resultadoContacto.rows[0].id,
      archivo.originalname,
      archivo.filename,
      archivo.mimetype,
      archivo.size
    ]);

    await cliente.query('COMMIT');

    return describirSubida({
      ...resultadoArchivo.rows[0],
      nombre,
      telefono
    });
  } catch (error) {
    try {
      await cliente.query('ROLLBACK');
    } catch (errorAlDeshacer) {
      console.error('No se pudo deshacer la transacción:', errorAlDeshacer.message);
    }

    throw error;
  } finally {
    cliente.release();
  }
}

/** Devuelve las subidas más recientes, primero las últimas. */
async function listarSubidas(limite = LIMITE_POR_DEFECTO) {
  const resultado = await pool.query(SQL_LISTAR_SUBIDAS, [limite]);

  return resultado.rows.map(describirSubida);
}

module.exports = { guardarSubida, listarSubidas };
