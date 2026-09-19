// Componente de relleno que da contenido a cada área de la disposición.

import { TIPO_COMPONENTE_AREA } from './configuracion.js';

/**
 * Registra en la disposición el tipo de componente usado por las áreas.
 *
 * Se usa una función de fábrica y no un constructor porque el componente es
 * simplemente un fragmento de DOM.
 */
export function registrarAreas(disposicion) {
  disposicion.registerComponentFactoryFunction(TIPO_COMPONENTE_AREA, crearComponenteArea);
}

/**
 * Crea el contenido de un área.
 *
 * Golden Layout no inserta el componente en el DOM cuando no es «virtual»:
 * hay que añadirlo a `contenedor.element`, que es el elemento con la clase
 * `lm_content` del área.
 */
function crearComponenteArea(contenedor, estado) {
  const datos = esObjeto(estado) ? estado : {};
  const id = textoOTextoPorDefecto(datos.id, '');
  const titulo = textoOTextoPorDefecto(datos.titulo, 'Área');
  const descripcion = textoOTextoPorDefecto(datos.descripcion, '');

  const elemento = document.createElement('section');
  elemento.className = 'area';

  // El identificador se pone en el elemento del contenido y se lee después con
  // `closest`, que ya encuentra la pila del área cuando el árbol está montado.
  // No se puede usar `closest` aquí: en este momento el contenido todavía no
  // está colgado de su pila.
  contenedor.element.dataset.areaId = id;

  const encabezado = document.createElement('h2');
  encabezado.className = 'area__titulo';
  encabezado.textContent = titulo;

  const texto = document.createElement('p');
  texto.className = 'area__descripcion';
  texto.textContent = descripcion;

  // Medida en vivo del área: sirve para comprobar que el arrastre de los
  // divisores y de las esquinas cambia de verdad los tamaños.
  const medida = document.createElement('p');
  medida.className = 'area__medida';

  const mostrarMedida = () => {
    const ancho = Math.round(contenedor.width);
    const alto = Math.round(contenedor.height);
    medida.textContent = `${ancho} × ${alto} px`;
  };

  mostrarMedida();
  contenedor.on('resize', mostrarMedida);

  elemento.append(encabezado, texto, medida);
  contenedor.element.appendChild(elemento);

  return elemento;
}

/** Indica si el valor recibido es un objeto plano, no nulo ni un array. */
function esObjeto(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

/** Devuelve el texto recibido o el valor por defecto si no es una cadena. */
function textoOTextoPorDefecto(valor, porDefecto) {
  return typeof valor === 'string' ? valor : porDefecto;
}
