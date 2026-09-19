// Lógica de la interfaz: conecta el formulario con las validaciones y la API.

import { validarNombre, validarTelefono, validarArchivo } from './validaciones.js';
import { enviarFormulario } from './api.js';

const formulario = document.querySelector('#formulario');
const campoNombre = document.querySelector('#nombre');
const campoTelefono = document.querySelector('#telefono');
const campoArchivo = document.querySelector('#archivo');
const botonEnviar = document.querySelector('#boton-enviar');
const estado = document.querySelector('#estado');

const ERRORES = {
  nombre: document.querySelector('#error-nombre'),
  telefono: document.querySelector('#error-telefono'),
  archivo: document.querySelector('#error-archivo')
};

const TEXTO_BOTON = 'Subir archivo';
const TEXTO_BOTON_ENVIANDO = 'Subiendo...';

/** Muestra u oculta el mensaje de error asociado a un campo. */
function mostrarErrorCampo(campo, mensaje) {
  const elemento = ERRORES[campo];
  elemento.textContent = mensaje;
  elemento.hidden = mensaje === '';
}

/** Muestra el mensaje de estado general del formulario. */
function mostrarEstado(mensaje, tipo) {
  estado.textContent = mensaje;
  estado.classList.toggle('estado--error', tipo === 'error');
  estado.classList.toggle('estado--exito', tipo === 'exito');
}

/**
 * Valida todos los campos.
 * Devuelve los datos normalizados, o null si hay algún error.
 */
function validarFormulario() {
  const nombre = campoNombre.value.trim();
  const telefono = campoTelefono.value.trim();
  const archivo = campoArchivo.files[0] || null;

  const errorNombre = validarNombre(nombre);
  const errorTelefono = validarTelefono(telefono);
  const errorArchivo = validarArchivo(archivo);

  mostrarErrorCampo('nombre', errorNombre);
  mostrarErrorCampo('telefono', errorTelefono);
  mostrarErrorCampo('archivo', errorArchivo);

  if (errorNombre || errorTelefono || errorArchivo) {
    return null;
  }

  return { nombre, telefono, archivo };
}

/** Bloquea o desbloquea el botón mientras se envía la petición. */
function bloquearBoton(bloqueado) {
  botonEnviar.disabled = bloqueado;
  botonEnviar.textContent = bloqueado ? TEXTO_BOTON_ENVIANDO : TEXTO_BOTON;
}

formulario.addEventListener('submit', async (evento) => {
  evento.preventDefault();
  mostrarEstado('', '');

  const datos = validarFormulario();
  if (!datos) {
    mostrarEstado('Revisa los campos marcados.', 'error');
    return;
  }

  bloquearBoton(true);
  mostrarEstado('Enviando datos al servidor...', '');

  try {
    await enviarFormulario(datos);
    formulario.reset();
    mostrarEstado('Datos enviados correctamente.', 'exito');
  } catch (error) {
    mostrarEstado(error.message, 'error');
  } finally {
    bloquearBoton(false);
  }
});

// Al corregir un campo se limpia su mensaje de error anterior.
campoNombre.addEventListener('input', () => mostrarErrorCampo('nombre', ''));
campoTelefono.addEventListener('input', () => mostrarErrorCampo('telefono', ''));
campoArchivo.addEventListener('change', () => mostrarErrorCampo('archivo', ''));
