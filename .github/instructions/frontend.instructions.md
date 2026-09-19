---
name: 'Reglas de frontend'
description: 'Arquitectura del frontend, consumo de la API y verificación en navegador'
applyTo: 'frontend/**'
---

# Reglas de frontend

## Tecnología

El frontend utiliza:

- HTML
- CSS
- JavaScript
- ES Modules
- `import` / `export`
- capacidades PWA cuando el proyecto sea una PWA

## Arquitectura

- El frontend consume la API HTTP del backend.
- No duplicar lógica de negocio del backend en el frontend.
- No importar módulos del backend.
- No acceder directamente a la base de datos.
- No crear una segunda API paralela dentro del frontend.

## Servidor local

- Levantar el frontend con `npx serve` o con el script definido en el propio proyecto.
- No usar Python para servir el frontend: ni `python -m http.server`, ni scripts `.py`, ni servidores escritos en Python.
- Si el proyecto tiene `package.json`, el comando de arranque debe vivir ahí en lugar de depender de comandos sueltos.
- Mantener documentado el puerto de desarrollo para poder indicárselo al usuario.

## PWA (opcional)

Aplicar esta sección solo si el proyecto es una PWA. Cuando una tarea la afecte, comprobar según corresponda:

- `manifest.json`;
- service worker;
- iconos;
- estrategia de caché;
- comportamiento offline;
- instalación de la aplicación.

No modificar la infraestructura PWA si existe y la tarea no la necesita.

No introducir dependencias del backend hacia los archivos del frontend.

## Interfaz

- Mantener separadas estructura, estilos y lógica cuando la arquitectura existente lo permita.
- Evitar introducir dependencias nuevas sin justificar su necesidad.
- Mantener nombres de archivos y carpetas en kebab-case.
- Mantener variables y funciones en camelCase.

## API

Antes de consumir o cambiar un endpoint:

1. comprobar el contrato real del backend;
2. localizar los consumidores existentes;
3. evitar inventar campos de respuesta;
4. gestionar errores HTTP de forma explícita.

## Verificación

Comprobar:

- carga de la aplicación;
- consola del navegador;
- peticiones HTTP relevantes;
- comportamiento de la PWA cuando el proyecto sea una PWA y la tarea la afecte;
- tests existentes.
