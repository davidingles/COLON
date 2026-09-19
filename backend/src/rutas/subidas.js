// Rutas relacionadas con la subida de archivos.

const express = require('express');

const { recibirArchivo } = require('../middleware/subida-archivo');
const { registrarSubidaDeArchivo, listarSubidas } = require('../controladores/subidas');

const enrutador = express.Router();

// POST /api/subidas
// Cuerpo multipart/form-data con los campos: nombre, telefono y archivo.
enrutador.post('/subidas', recibirArchivo, registrarSubidaDeArchivo);

// GET /api/subidas
// Devuelve { subidas: [...] }, de la más reciente a la más antigua.
enrutador.get('/subidas', listarSubidas);

module.exports = { enrutadorSubidas: enrutador };
