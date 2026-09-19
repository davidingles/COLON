# Reglas globales del proyecto

Estas reglas se aplican a cualquier agente que trabaje en este proyecto.

## 1. Flujo obligatorio antes de modificar código

Antes de crear, modificar o eliminar código:

1. **Comprensión**: resume brevemente qué has entendido de la petición.
2. **Planificación**: muestra los pasos concretos que vas a realizar.
3. **Arquitectura**: si existe más de una opción razonable de arquitectura o diseño, explica las opciones y detente hasta recibir confirmación explícita del usuario.
4. **Permiso**: si no hay decisiones pendientes, solicita confirmación antes de ejecutar cambios.

No empieces a editar archivos simplemente porque el usuario haya descrito una tarea. Primero pasa por este flujo.

### Permiso cuando el agente se ejecuta como subagente

Si VS Code invoca al agente como subagente, desactiva las herramientas `askQuestions` y `todo`: no hay canal para preguntar al usuario.

En ese caso, el paso 4 se cumple así:

- el agente no edita archivos salvo que la petición recibida autorice explícitamente los cambios;
- si esa autorización no existe, devuelve el plan y se detiene en lugar de implementar;
- el agente indica en su resultado qué decisiones requerían confirmación humana.

La confirmación previa del usuario se obtiene, por tanto, invocando al agente de forma directa desde el selector de agentes.

## 2. Identificación y trazabilidad

Al comenzar una tarea, indica:

- `AGENTE: <nombre del agente>`
- `REGLAS: AGENTS.md + reglas específicas del área`
- `FASE: comprensión | planificación | implementación | verificación`

Antes de terminar una tarea, informa de:

- archivos modificados;
- comprobaciones realizadas;
- posibles incumplimientos de reglas;
- pruebas ejecutadas y su resultado.

No afirmes que una regla se ha cumplido si no la has comprobado.

## 3. Arquitectura del proyecto

La aplicación está desacoplada:

```text
proyecto/
├── backend/     # API Node.js + Express
├── database/    # PostgreSQL / SQL
└── frontend/    # Web
```

Reglas de dependencia:

- El backend es independiente del frontend.
- El backend no debe depender de manifest.json, service worker, iconos ni archivos del frontend.
- El frontend solo se comunica con el backend mediante la API HTTP.
- La lógica de negocio del backend no debe trasladarse al frontend.
- La base de datos no debe contener lógica específica de presentación.
- Las decisiones de arquitectura que afecten a más de un área deben coordinarse antes de implementarse.

## 4. Código

- No generar código minificado u ofuscado.
- Usar nombres de variables y funciones descriptivos.
- Los comentarios dentro del código deben estar exclusivamente en español.
- Backend: CommonJS (`require` / `module.exports`).
- Frontend: ES Modules (`import` / `export`).
- Archivos y carpetas: minúsculas y kebab-case.
- Variables y funciones: camelCase.
- Constantes: UPPER_SNAKE_CASE.
- No usar placeholders como `// ... resto del código`.
- Nunca eliminar código funcional simplemente para acortar una respuesta.

## 5. Windows y PowerShell

El entorno objetivo es Windows 10/11.

- Usar PowerShell / pwsh.
- Usar rutas de Windows cuando se proporcionen rutas al usuario.
- Preferir comandos nativos de PowerShell: `New-Item`, `Copy-Item`, `Remove-Item`, etc.
- Mantener CRLF en archivos de texto del proyecto cuando sea compatible con la herramienta.
- Usar 2 espacios de indentación en el código del proyecto.

## 6. Archivos protegidos

No sobrescribir archivos de configuración o documentación protegidos sin indicarlo previamente.

En particular:

- `AGENTS.md`
- `README.md`

Si una tarea requiere modificar una regla global, detenerse y pedir confirmación.

## 7. Documentación

Mantener `README.md` actualizado cuando una modificación cambie:

- la forma de instalar el proyecto;
- la forma de arrancarlo;
- sus tecnologías;
- la estructura principal;
- comandos relevantes para desarrollo o pruebas.

## 8. Verificación

Toda modificación debe terminar con una fase de verificación apropiada.

La verificación debe comprobar, como mínimo:

- que el código modificado es coherente con la arquitectura;
- que no se han modificado áreas fuera del alcance;
- que las pruebas o comprobaciones disponibles se han ejecutado;
- que no se han introducido errores evidentes.

Si no se puede ejecutar una comprobación, dilo expresamente.

## 9. Regla de honestidad

Nunca digas "todo correcto", "cumple las reglas" o equivalente sin haberlo comprobado.

Si detectas una contradicción entre estas reglas y una petición del usuario:

1. señala la contradicción;
2. explica qué regla afecta;
3. pide confirmación si es necesario;
4. no ocultes la contradicción para poder completar la tarea.
