// Componente de relleno que da contenido a cada área de la disposición.

import {
  PASO_ZOOM,
  TIPO_COMPONENTE_AREA,
  ZOOM_MAXIMO,
  ZOOM_MINIMO,
  ZOOM_POR_DEFECTO
} from './configuracion.js';

// Aviso que se lanza en el contenido del área cuando cambia su zoom, para que el
// propio componente vuelva a escribir su línea de medidas.
const EVENTO_ESCALA = 'escala-cambiada';

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

  aplicarEscala(elemento, limitarEscala(datos.escala));

  const encabezado = document.createElement('h2');
  encabezado.className = 'area__titulo';
  encabezado.textContent = titulo;

  const texto = document.createElement('p');
  texto.className = 'area__descripcion';
  texto.textContent = descripcion;

  // Medida en vivo del área: sirve para comprobar que el arrastre de los
  // divisores y de las esquinas cambia de verdad los tamaños. Cuando el
  // contenido tiene zoom, se añade el porcentaje para que se vea de un vistazo.
  const medida = document.createElement('p');
  medida.className = 'area__medida';

  const mostrarMedida = () => {
    const ancho = Math.round(contenedor.width);
    const alto = Math.round(contenedor.height);
    const escala = leerEscala(elemento);

    medida.textContent =
      escala === ZOOM_POR_DEFECTO
        ? `${ancho} × ${alto} px`
        : `${ancho} × ${alto} px · ${Math.round(escala * 100)} %`;
  };

  mostrarMedida();
  contenedor.on('resize', mostrarMedida);
  elemento.addEventListener(EVENTO_ESCALA, mostrarMedida);

  // Golden Layout pide aquí el estado del componente cada vez que guarda la
  // disposición, así que el zoom viaja con el área: sobrevive a recargar la
  // página y a dividir o fundir.
  contenedor.stateRequestEvent = () => ({ ...datos, escala: leerEscala(elemento) });

  elemento.append(encabezado, texto, medida);
  contenedor.element.appendChild(elemento);

  return elemento;
}

/**
 * Pone el zoom en el contenido del área.
 *
 * Se usa la propiedad `zoom`, que escala todo (tipografías, botones, bordes y
 * espacios) y además vuelve a maquetar el contenido en el hueco que queda. Con
 * `transform: scale` no se recolocaría nada y el texto saldría borroso.
 */
export function aplicarEscala(elemento, escala) {
  elemento.dataset.escala = String(escala);
  elemento.style.zoom = escala === ZOOM_POR_DEFECTO ? '' : String(escala);

  elemento.dispatchEvent(new Event(EVENTO_ESCALA));
}

/** Devuelve el zoom del contenido del área. */
export function leerEscala(elemento) {
  const valor = Number.parseFloat(elemento.dataset.escala ?? '');
  return Number.isNaN(valor) ? ZOOM_POR_DEFECTO : valor;
}

/** Deja el zoom dentro de los límites y ajustado al paso de la rueda. */
export function limitarEscala(valor) {
  if (typeof valor !== 'number' || Number.isNaN(valor)) {
    return ZOOM_POR_DEFECTO;
  }

  const pasos = Math.round(valor / PASO_ZOOM);
  const ajustado = Math.min(ZOOM_MAXIMO, Math.max(ZOOM_MINIMO, pasos * PASO_ZOOM));

  // Sin redondear, multiplicar el paso deja valores como 1,2000000000000002.
  return Math.round(ajustado * 100) / 100;
}

/** Indica si el valor recibido es un objeto plano, no nulo ni un array. */
function esObjeto(valor) {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor);
}

/** Devuelve el texto recibido o el valor por defecto si no es una cadena. */
function textoOTextoPorDefecto(valor, porDefecto) {
  return typeof valor === 'string' ? valor : porDefecto;
}
