-- Datos de ejemplo.
--
-- NO es una migración: son datos inventados para poder probar el listado sin
-- pasar por el formulario. El esquema se crea con las migraciones.
--
-- Se puede ejecutar más de una vez: las restricciones únicas evitan duplicados.
--
-- AVISO: las filas de "archivos" describen archivos que NO existen en disco.
-- Son metadatos coherentes con el esquema, pero no hay ningún archivo real
-- asociado. Si en el futuro el backend sirve los archivos, estas filas fallarán.

INSERT INTO contactos (nombre, telefono) VALUES
  ('Lucía Fernández', '+34 611 223 344'),
  ('Marc Oliveras', '622 998 771'),
  ('Nadia El Amrani', '+34 633 445 566'),
  ('Tomás Iriarte', '644 112 233'),
  ('Paula Rivas', '+34 655 778 899')
ON CONFLICT (nombre, telefono) DO NOTHING;

INSERT INTO archivos (contacto_id, nombre_original, nombre_guardado, tipo_contenido, tamano)
SELECT contacto.id, datos.nombre_original, datos.nombre_guardado, datos.tipo_contenido, datos.tamano
FROM (
  VALUES
    ('Lucía Fernández', '+34 611 223 344', 'presupuesto-cocina.pdf', '1758300000001-100000001.pdf', 'application/pdf', 184320::bigint),
    ('Marc Oliveras', '622 998 771', 'factura-luz-marzo.pdf', '1758300000002-100000002.pdf', 'application/pdf', 96256),
    ('Nadia El Amrani', '+34 633 445 566', 'foto-obra-1.jpg', '1758300000003-100000003.jpg', 'image/jpeg', 2458112),
    ('Tomás Iriarte', '644 112 233', 'plano-planta.pdf', '1758300000004-100000004.pdf', 'application/pdf', 524288),
    ('Paula Rivas', '+34 655 778 899', 'listado-materiales.xlsx', '1758300000005-100000005.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 45056)
) AS datos (nombre, telefono, nombre_original, nombre_guardado, tipo_contenido, tamano)
JOIN contactos AS contacto
  ON contacto.nombre = datos.nombre
  AND contacto.telefono = datos.telefono
ON CONFLICT (nombre_guardado) DO NOTHING;

-- Resumen para comprobar el resultado de la ejecución.
SELECT contacto.nombre,
       contacto.telefono,
       count(archivo.id) AS archivos
FROM contactos AS contacto
LEFT JOIN archivos AS archivo ON archivo.contacto_id = contacto.id
GROUP BY contacto.id, contacto.nombre, contacto.telefono
ORDER BY contacto.nombre;
