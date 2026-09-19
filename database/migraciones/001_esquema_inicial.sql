-- Migración 001: esquema inicial.
--
-- Un contacto agrupa todos los envíos de la misma persona. La pareja
-- (nombre, telefono) es única, así que un envío repetido con los mismos datos
-- reutiliza la fila existente en lugar de duplicarla.

CREATE TABLE contactos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre text NOT NULL,
  telefono text NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT contactos_nombre_no_vacio CHECK (btrim(nombre) <> ''),
  CONSTRAINT contactos_telefono_no_vacio CHECK (btrim(telefono) <> ''),
  CONSTRAINT contactos_nombre_telefono_unico UNIQUE (nombre, telefono)
);

COMMENT ON TABLE contactos IS 'Personas que han enviado algún archivo.';
COMMENT ON COLUMN contactos.nombre IS 'Nombre tal y como lo escribió la persona, ya recortado.';
COMMENT ON COLUMN contactos.telefono IS 'Teléfono en formato libre, solo con los separadores habituales.';

CREATE TABLE archivos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  contacto_id bigint NOT NULL,
  nombre_original text NOT NULL,
  nombre_guardado text NOT NULL,
  tipo_contenido text NOT NULL,
  tamano bigint NOT NULL,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT archivos_contacto_fk
    FOREIGN KEY (contacto_id) REFERENCES contactos (id) ON DELETE CASCADE,
  CONSTRAINT archivos_nombre_guardado_unico UNIQUE (nombre_guardado),
  CONSTRAINT archivos_tamano_no_negativo CHECK (tamano >= 0)
);

COMMENT ON TABLE archivos IS 'Archivos subidos. El contenido vive en disco; aquí solo están los metadatos.';
COMMENT ON COLUMN archivos.nombre_original IS 'Nombre que tenía el archivo en el equipo de origen.';
COMMENT ON COLUMN archivos.nombre_guardado IS 'Nombre en disco, generado para que sea único.';
COMMENT ON COLUMN archivos.tamano IS 'Tamaño en bytes.';

-- La clave ajena no crea un índice por sí sola, y es la columna por la que se
-- consultan los archivos de un contacto.
CREATE INDEX archivos_contacto_id_idx ON archivos (contacto_id);

-- Las consultas de listado se ordenan por fecha descendente.
CREATE INDEX archivos_creado_en_idx ON archivos (creado_en DESC);
