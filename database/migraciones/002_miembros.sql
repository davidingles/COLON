-- Migración 002: miembros de la familia.
--
-- Son los datos de la sección «Familia». Solo el nombre es obligatorio; el
-- resto puede faltar, así que las columnas admiten nulos y los textos vacíos no
-- se guardan como cadena vacía sino como nulo.
--
-- Los archivos y las fotos de cada miembro vivirán en su propia tabla, con el
-- contenido en disco, igual que los archivos de las subidas.

CREATE TABLE miembros (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nombre text NOT NULL,
  nacimiento date,
  parentesco text,
  telefono text,
  correo text,
  notas text,
  creado_en timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT miembros_nombre_no_vacio CHECK (btrim(nombre) <> '')
);

COMMENT ON TABLE miembros IS 'Miembros de la familia.';
COMMENT ON COLUMN miembros.nombre IS 'Nombre completo, tal y como se escribió, ya recortado.';
COMMENT ON COLUMN miembros.nacimiento IS 'Fecha de nacimiento. Puede faltar.';
COMMENT ON COLUMN miembros.parentesco IS 'Texto libre: padre, madre, hijo, etc. Sin lista cerrada.';
COMMENT ON COLUMN miembros.telefono IS 'Teléfono en formato libre, solo con los separadores habituales.';
COMMENT ON COLUMN miembros.correo IS 'Correo electrónico. Puede faltar.';
COMMENT ON COLUMN miembros.notas IS 'Notas libres sobre el miembro.';

-- Los listados y el buscador van ordenados por nombre.
CREATE INDEX miembros_nombre_idx ON miembros (nombre);
