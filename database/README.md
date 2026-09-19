# Base de datos

Esquema PostgreSQL del proyecto. Esta carpeta es independiente del backend y del frontend: no contiene lógica de presentación ni código de la aplicación.

## Requisitos

- PostgreSQL 17 instalado y el servicio arrancado.
- `psql` en el PATH o en la ruta habitual de instalación (`C:\Program Files\PostgreSQL\<versión>\bin`).

## Objetos que se crean

| Objeto | Nombre |
| --- | --- |
| Base de datos | `pwa_tareas_03` |
| Base de datos de pruebas | `pwa_tareas_03_pruebas` |
| Rol de aplicación | `pwa_tareas_03_app` |
| Tabla de control de versiones | `esquema_migraciones` |

## Puesta en marcha

### 1. Crear el rol y las bases de datos (solo la primera vez)

Se ejecuta conectando como superusuario y pide las contraseñas por consola. **Las contraseñas no se guardan en ningún archivo ni se escriben en el historial.**

```powershell
.\instalacion\crear-base-de-datos.ps1
```

Si `psql` no está en el PATH:

```powershell
.\instalacion\crear-base-de-datos.ps1 -RutaPsql 'C:\Program Files\PostgreSQL\17\bin\psql.exe'
```

El script es repetible: si el rol o las bases ya existen, solo actualiza la contraseña del rol y no toca las bases de datos.

### 2. Configurar las credenciales

El archivo `backend\.env` (no versionado) debe contener:

```text
PGHOST=localhost
PGPORT=5432
PGDATABASE=pwa_tareas_03
PGUSER=pwa_tareas_03_app
PGPASSWORD=<la contraseña del rol>
```

Se usan las variables estándar de PostgreSQL, que `psql` y el driver `pg` interpretan por sí solos. No hace falta construir ninguna cadena de conexión.

### 3. Aplicar las migraciones

```powershell
.\migraciones\aplicar.ps1
```

Cada migración se aplica junto con el registro de su versión **dentro de la misma transacción**: si el SQL falla, no queda nada a medias ni registrado.

| Parámetro | Descripción |
| --- | --- |
| `-ArchivoEnv` | Archivo de credenciales. Por defecto `backend\.env`. |
| `-RutaPsql` | Ruta a `psql.exe` si no está en el PATH. |
| `-BaseDeDatos` | Aplica las migraciones a otra base distinta de `PGDATABASE`. |
| `-Simular` | Muestra qué se aplicaría sin tocar la base de datos. |

Para dejar lista la base de pruebas, que es la que usan las pruebas de integración del backend:

```powershell
.\migraciones\aplicar.ps1 -BaseDeDatos pwa_tareas_03_pruebas
```

Para comprobar el estado sin aplicar nada:

```powershell
.\migraciones\aplicar.ps1 -Simular
```

## Estructura

```text
database/
├── comun/
│   └── utilidades-psql.ps1        # localizar psql, leer credenciales, ejecutar SQL
├── instalacion/
│   └── crear-base-de-datos.ps1    # rol y bases de datos (requiere superusuario)
├── migraciones/
│   ├── aplicar.ps1                # aplica las migraciones pendientes
│   └── 001_esquema_inicial.sql    # esquema inicial
├── datos-de-ejemplo.sql           # datos inventados para probar
├── ejecutar-sql.ps1               # ejecuta un archivo SQL suelto
└── README.md
```

## Migraciones

Se numeran con un prefijo de tres dígitos y un nombre descriptivo: `001_esquema_inicial.sql`, `002_...`. El ejecutor las ordena por nombre y aplica solo las que no estén en `esquema_migraciones`.

Reglas:

- Una migración aplicada **no se modifica nunca**: los cambios se añaden en una migración nueva.
- El nombre debe empezar por el número y un guion bajo, o el archivo se ignora con un aviso.
- No se usan `DROP`, `TRUNCATE` ni `DELETE` sin condición sin confirmación explícita.

## Datos de ejemplo

Contiene cinco contactos inventados con un archivo cada uno, para poder probar el listado sin pasar por el formulario.

```powershell
.\ejecutar-sql.ps1 .\datos-de-ejemplo.sql
```

El script `ejecutar-sql.ps1` sirve para cualquier archivo SQL suelto y ejecuta todo el contenido dentro de una única transacción. Por eso los archivos SQL **no deben incluir `BEGIN` ni `COMMIT`**.

Admite `-ArchivoEnv`, `-RutaPsql` y `-BaseDeDatos`, con el mismo significado que en el aplicador de migraciones.

Aviso: las filas de la tabla `archivos` describen archivos que **no existen en disco**. Son metadatos coherentes con el esquema, pero no hay ningún archivo real detrás.

## Esquema

```text
contactos
├── id          bigint, clave primaria, generado
├── nombre      text, no vacío
├── telefono    text, no vacío
├── creado_en   timestamptz
└── restricción única (nombre, telefono)

archivos
├── id               bigint, clave primaria, generado
├── contacto_id      bigint, clave ajena -> contactos(id), al borrar en cascada
├── nombre_original  text
├── nombre_guardado  text, único
├── tipo_contenido   text
├── tamano           bigint, no negativo
├── creado_en        timestamptz
└── índices: contacto_id, creado_en descendente
```

Un contacto agrupa todos los envíos de la misma persona: la pareja `(nombre, telefono)` es única, así que un envío repetido con los mismos datos reutiliza la fila existente en lugar de duplicarla.

## Decisiones y limitaciones

- **El rol de aplicación es el propietario de las bases de datos.** Es lo que le permite aplicar las migraciones y crear tablas, y evita manejar dos credenciales en un entorno local. En un entorno compartido lo correcto es separar un rol propietario que migra y un rol de ejecución con permisos solo de lectura y escritura.
- **El ejecutor de migraciones lee `backend\.env` por defecto.** Las credenciales son las mismas que usa el backend y duplicarlas en dos archivos sería peor, pero es un acoplamiento entre áreas: se puede apuntar a otro archivo con `-ArchivoEnv`.
- **Las contraseñas se pasan a `psql` mediante la variable de entorno `PGPASSWORD`**, no como argumento de línea de comandos, para que no queden visibles en el listado de procesos.
- **Sin cifrado en tránsito.** No se configura `PGSSLMODE`; en local la conexión va sin cifrar. La variable está admitida por si hace falta en otro entorno.
- **Sin copias de seguridad.** No hay ningún mecanismo de respaldo.
