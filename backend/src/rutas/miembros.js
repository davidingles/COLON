// Rutas relacionadas con los miembros de la familia.

const express = require('express');

const { borrarMiembro, listarMiembros, registrarMiembro } = require('../controladores/miembros');

const enrutador = express.Router();

// GET /api/miembros
// Devuelve { miembros: [...] }, ordenados por nombre.
enrutador.get('/miembros', listarMiembros);

// POST /api/miembros
// Cuerpo JSON con los campos: nombre (obligatorio), nacimiento, parentesco,
// telefono, correo y notas.
enrutador.post('/miembros', registrarMiembro);

// DELETE /api/miembros/:id
enrutador.delete('/miembros/:id', borrarMiembro);

module.exports = { enrutadorMiembros: enrutador };
