---
name: 'Reglas de backend'
description: 'Convenciones, arquitectura, contratos de API y acceso a datos del backend'
applyTo: 'backend/**'
---

# Reglas de backend

## Tecnología

El backend utiliza:

- Node.js
- Express
- CommonJS
- `require`
- `module.exports`

## Arquitectura

- El backend expone una API HTTP.
- El backend es independiente del frontend.
- La lógica de negocio pertenece al backend.
- El backend no debe depender de `manifest.json`, service worker, iconos ni archivos del frontend.
- No introducir dependencias del backend hacia `frontend/**`.
- El backend no debe importar ni leer archivos específicos del frontend para funcionar.

## Configuración y secretos

- La configuración sensible no debe quedar escrita directamente en el código.
- Los valores de configuración se obtienen del entorno, no de archivos versionados.

## Acceso a datos

- El backend puede consumir la capa de base de datos, pero debe respetar la separación establecida por el proyecto.
- No introducir consultas SQL dispersas dentro de las rutas si existe una capa específica para acceso a datos.
- La base de datos no debe contener lógica de presentación.

## API

Antes de cambiar un endpoint existente:

1. localizar su implementación;
2. comprobar sus consumidores;
3. comprobar validaciones y manejo de errores;
4. comprobar si existe documentación o test relacionado;
5. explicar cualquier cambio de contrato.

No cambiar silenciosamente nombres de rutas, métodos HTTP, formatos de respuesta o códigos de estado que ya estén siendo utilizados.

## Convenciones propias del área

Además de las convenciones globales de `AGENTS.md`:

- Nombres de rutas y recursos coherentes con el resto de la API.
- Manejo de errores explícito, sin tragarse excepciones.
- Nada de código minificado u ofuscado.
- Comentarios exclusivamente en español.

## Verificación

Después de un cambio en backend:

- ejecutar los tests de backend disponibles;
- comprobar los endpoints afectados;
- revisar errores y casos límite relevantes;
- indicar exactamente qué se comprobó y qué no se pudo comprobar.
