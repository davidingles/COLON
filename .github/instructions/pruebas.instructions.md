---
name: 'Reglas de pruebas'
description: 'Convenciones para tests y comprobaciones automatizadas del proyecto'
applyTo: '**/*.test.js,**/*.spec.js,**/tests/**,**/test/**'
---

# Reglas de pruebas

## Principios

- Un test comprueba un comportamiento observable, no la implementación interna.
- Los nombres de los tests describen el comportamiento esperado y están en español.
- Evitar dependencias de red reales en tests unitarios.
- No dejar tests desactivados (`.skip`, `xit`) sin justificarlo.

## Estructura

- Los tests se ubican junto al área que prueban o en una carpeta `tests/` del área correspondiente.
- Los datos de prueba deben ser explícitos y legibles.
- Limpiar el estado entre tests cuando compartan recursos.

## Honestidad en los resultados

- No informar de un test como superado si no se ha ejecutado.
- Si un test no se puede ejecutar, indicar el motivo: dependencias ausentes, base de datos no disponible, entorno incompleto.
- Diferenciar `PASS`, `FAIL` y `WARNING`; no convertir una sospecha en un fallo confirmado.

## Verificación manual

Cuando no existan tests automatizados para un cambio:

- indicarlo expresamente;
- describir las comprobaciones manuales realizadas;
- señalar qué queda sin verificar.
