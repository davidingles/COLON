# Backend

API HTTP que atiende el formulario de contacto y la subida de un archivo.

- Node.js + Express
- PostgreSQL a través del driver `pg`
- CommonJS (`require` / `module.exports`)
- Sin CORS configurado: el frontend usa el proxy de Vite y llama al mismo origen

## Requisitos

- Node.js (probado con Node 24)
- npm (probado con npm 11)

## Instalación

```powershell
cd backend
npm install
```

## Arranque

```powershell
cd backend
npm start
```

Para desarrollo con recarga automática:

```powershell
cd backend
npm run dev
```

El servidor escucha en `http://localhost:3000`, que es el puerto que espera el proxy de `frontend/vite.config.js`.

## Pruebas

```powershell
cd backend
npm test
```

Usan el ejecutor nativo de Node (`node:test`), sin dependencias adicionales.

Hay dos grupos:

- **`test/subidas.test.js`**: prueban la API y las validaciones sustituyendo el almacén por uno en memoria. No necesitan PostgreSQL y no cubren la SQL real.
- **`test/integracion/`**: hablan con PostgreSQL de verdad. Usan la base de pruebas, nunca la de desarrollo, escriben los archivos en una carpeta temporal y borran todo lo que crean.

Antes de ejecutar las de integración, la base de pruebas necesita tener el esquema:

```powershell
.\database\migraciones\aplicar.ps1 -BaseDeDatos pwa_tareas_03_pruebas
```

Si falta, fallan indicando ese mismo comando.

## Configuración

Las variables se leen del entorno. En `.env.example` están documentadas con valores de ejemplo; el archivo `.env` no se versiona.

| Variable | Valor por defecto | Descripción |
| --- | --- | --- |
| `PORT` | `3000` | Puerto del servidor |
| `DIRECTORIO_SUBIDAS` | `subidas` (relativo a `backend/`) | Carpeta donde se guardan los archivos |
| `PGHOST` | `localhost` | Servidor de PostgreSQL |
| `PGPORT` | `5432` | Puerto de PostgreSQL |
| `PGDATABASE` | — | Base de datos (obligatoria) |
| `PGUSER` | — | Rol de la aplicación (obligatorio) |
| `PGPASSWORD` | — | Contraseña del rol (obligatoria) |

Las variables `PG*` son las estándar de PostgreSQL: tanto `psql` como el driver `pg` las interpretan por sí solos, sin construir ninguna cadena de conexión.

Los scripts `npm start`, `npm run dev` y `npm test` cargan `.env` automáticamente mediante `--env-file-if-exists=.env`. Para lanzar el proceso a mano:

```powershell
node --env-file=.env src/servidor.js
```

La base de datos se crea y se migra desde `database/`. Consulta `database/README.md`.

## Estructura

```text
backend/
├── src/
│   ├── servidor.js             # arranque del proceso y cierre ordenado
│   ├── app.js                  # aplicación Express, 404 y manejo de errores
│   ├── config.js               # configuración leída del entorno
│   ├── rutas/                  # definición de rutas
│   ├── controladores/          # entrada y salida de cada petición
│   ├── middleware/             # recepción del archivo con multer
│   ├── servicios/              # conexión con PostgreSQL y acceso a los datos
│   ├── validaciones/           # validación de los datos recibidos
│   └── errores/                # error de solicitud con código HTTP
└── test/                       # pruebas con node:test
```

## API

### `POST /api/subidas`

Cuerpo `multipart/form-data`:

| Campo | Tipo | Obligatorio |
| --- | --- | --- |
| `nombre` | texto | sí |
| `telefono` | texto | sí |
| `archivo` | binario (uno solo) | sí |

Respuesta correcta: `201` con el recurso creado.

```json
{
  "id": 1,
  "nombre": "Ana Pérez",
  "telefono": "+34 600 123 456",
  "archivo": {
    "nombreOriginal": "nota.txt",
    "nombreGuardado": "1758291283456-123456789.txt",
    "tipoContenido": "text/plain",
    "tamano": 19
  },
  "fecha": "2026-09-19T15:14:41.435Z"
}
```

Códigos de error:

| Código | Situación |
| --- | --- |
| `400` | Falta un campo obligatorio, el teléfono no es válido o el archivo no se pudo procesar |
| `404` | La ruta no existe |
| `500` | Error no controlado |
| `503` | No se pudo conectar con PostgreSQL |

Los errores se devuelven como `{ "error": "mensaje" }`.

### `GET /api/subidas`

Devuelve las subidas guardadas, de la más reciente a la más antigua.

```json
{
  "subidas": [
    {
      "id": 1,
      "nombre": "Ana Pérez",
      "telefono": "+34 600 123 456",
      "archivo": {
        "nombreOriginal": "nota.txt",
        "nombreGuardado": "1758291283456-123456789.txt",
        "tipoContenido": "text/plain",
        "tamano": 19
      },
      "fecha": "2026-09-19T15:14:41.435Z"
    }
  ]
}
```

Devuelve como máximo 50 elementos. Todavía no admite paginación.

## Limitaciones conocidas

- **Requiere PostgreSQL**: si no responde, el servidor arranca igualmente, avisa por consola y las peticiones que necesiten datos devuelven `503`.
- **El archivo se guarda en disco; los metadatos, en PostgreSQL.** No hay ninguna ruta que devuelva los archivos, así que no se pueden visualizar desde el navegador. Si se añade, habrá que controlar el tipo de contenido para evitar servir HTML ejecutable.
- **Sin límite de tamaño ni de tipo de archivo**: es la configuración elegida para el proyecto. Cualquier cliente puede enviar un archivo de tamaño arbitrario, lo que expone al servidor a un consumo de disco y ancho de banda sin control. Debe revisarse antes de exponer el backend fuera de la máquina local.
- **Sin autenticación**: los endpoints son abiertos.
- **Sin CORS**: solo funciona con el proxy del frontend o con herramientas como `curl`.
- **`GET /api/subidas` no pagina**: devuelve siempre como máximo 50 elementos.
- **Las pruebas de integración necesitan la base de pruebas migrada**, no arrancan solas si falta el esquema.
