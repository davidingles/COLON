---
name: 'Reglas de base de datos'
description: 'Esquema, SQL, migraciones y compatibilidad de la base de datos'
applyTo: 'database/**'
---

# Reglas de base de datos

## Tecnología

La base de datos debe mantenerse desacoplada de la interfaz.

La tecnología SQL concreta será la definida por el proyecto. No asumir PostgreSQL si el proyecto utiliza otra base de datos en una tarea concreta.

## Reglas

- Mantener el esquema claro y consistente.
- Evitar duplicación innecesaria de datos.
- Usar claves, índices y restricciones cuando estén justificadas.
- No introducir lógica de presentación en SQL.
- No almacenar secretos directamente en archivos versionados.
- Documentar cambios de esquema que afecten al backend.

## Migraciones

Si el proyecto dispone de sistema de migraciones:

- usarlo;
- no modificar manualmente una base de datos de desarrollo como sustituto de una migración;
- mantener las migraciones reproducibles.

Si no existe sistema de migraciones y una modificación lo hace necesario, detenerse y plantear la opción antes de crear una arquitectura nueva.

## Compatibilidad

Antes de cambiar tablas, columnas, tipos o restricciones:

1. localizar consultas existentes;
2. comprobar qué código las utiliza;
3. identificar posibles incompatibilidades;
4. explicar el impacto.

No eliminar ni renombrar estructuras utilizadas sin confirmación.

## Operaciones destructivas

`DROP`, `TRUNCATE` o `DELETE` sin condición requieren confirmación explícita del usuario antes de ejecutarse, incluso en desarrollo.

## Verificación

Después de un cambio:

- validar el esquema;
- ejecutar migraciones o comprobaciones disponibles;
- comprobar las consultas afectadas;
- revisar restricciones e índices;
- informar de cualquier riesgo de compatibilidad.
