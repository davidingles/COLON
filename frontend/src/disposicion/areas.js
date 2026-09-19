// Componente de relleno que da contenido a cada área de la disposición.

import {
  buscarSeccion,
  buscarVista,
  PASO_ZOOM,
  SECCIONES,
  SECCION_POR_DEFECTO,
  TIPO_COMPONENTE_AREA,
  ZOOM_MAXIMO,
  ZOOM_MINIMO,
  ZOOM_POR_DEFECTO
} from './configuracion.js';
import { crearVista } from '../secciones/registro.js';

// Aviso que se lanza en el contenido del área cuando cambia su zoom, para que el
// propio componente vuelva a escribir su línea de medidas.
const EVENTO_ESCALA = 'escala-cambiada';

/**
 * Registra en la disposición el tipo de componente usado por las áreas.
 *
 * Se usa una función de fábrica y no un constructor porque el componente es
 * simplemente un fragmento de DOM. `alCambiarSeccion` sirve para avisar de que
 * hay que volver a guardar la disposición.
 */
export function registrarAreas(disposicion, alCambiarSeccion) {
  disposicion.registerComponentFactoryFunction(TIPO_COMPONENTE_AREA, (contenedor, estado) =>
    crearComponenteArea(contenedor, estado, alCambiarSeccion)
  );
}

/**
 * Crea el contenido de un área: el desplegable de sección y lo que muestra la
 * sección elegida.
 *
 * Golden Layout no inserta el componente en el DOM cuando no es «virtual»:
 * hay que añadirlo a `contenedor.element`, que es el elemento con la clase
 * `lm_content` del área.
 */
function crearComponenteArea(contenedor, estado, alCambiarSeccion) {
  const datos = esObjeto(estado) ? estado : {};
  const id = textoOTextoPorDefecto(datos.id, '');

  const elemento = document.createElement('section');
  elemento.className = 'area';

  // El identificador se pone en el elemento del contenido y se lee después con
  // `closest`, que ya encuentra la pila del área cuando el árbol está montado.
  // No se puede usar `closest` aquí: en este momento el contenido todavía no
  // está colgado de su pila.
  contenedor.element.dataset.areaId = id;

  aplicarEscala(elemento, limitarEscala(datos.escala));

  const barra = crearBarraDeSeccion();
  const selector = barra.querySelector('.area__selector');

  // Menú con las vistas de la sección, como el que tiene cada editor de Blender.
  const menu = document.createElement('nav');
  menu.className = 'area__menu';
  menu.setAttribute('aria-label', 'Vistas de la sección');

  const vista = document.createElement('div');
  vista.className = 'area__vista';

  // Medida en vivo del área: sirve para comprobar que el arrastre de los
  // divisores y de las esquinas cambia de verdad los tamaños. Cuando el
  // contenido tiene zoom, se añade el porcentaje para que se vea de un vistazo.
  const medida = document.createElement('p');
  medida.className = 'area__medida';

  let seccionActual = null;
  let vistaActual = null;
  let vistaPropia = null;

  const mostrarMedida = () => {
    const ancho = Math.round(contenedor.width);
    const alto = Math.round(contenedor.height);
    const escala = leerEscala(elemento);

    medida.textContent =
      escala === ZOOM_POR_DEFECTO
        ? `${ancho} × ${alto} px`
        : `${ancho} × ${alto} px · ${Math.round(escala * 100)} %`;
  };

  /** Enseña la sección elegida, su menú y su vista. */
  const mostrarSeccion = (idSeccion, idVista) => {
    seccionActual = buscarSeccion(idSeccion);

    elemento.dataset.seccion = seccionActual.id;
    selector.value = seccionActual.id;

    // Como en Blender, el encabezado del área enseña qué está mostrando.
    contenedor.parent?.setTitle(seccionActual.titulo);

    dibujarMenu();

    const elegida = buscarVista(seccionActual, idVista);
    mostrarVista(elegida === null ? null : elegida.id);
  };

  /** Crea los botones del menú con las vistas de la sección. */
  const dibujarMenu = () => {
    menu.replaceChildren();
    menu.hidden = seccionActual.vistas.length === 0;

    for (const opcion of seccionActual.vistas) {
      const boton = document.createElement('button');
      boton.className = 'area__menu-boton';
      boton.type = 'button';
      boton.textContent = opcion.titulo;
      boton.dataset.vista = opcion.id;
      boton.addEventListener('click', () => {
        mostrarVista(opcion.id);

        if (alCambiarSeccion !== undefined) {
          alCambiarSeccion();
        }
      });

      menu.appendChild(boton);
    }
  };

  /** Enseña una vista dentro del área. */
  const mostrarVista = (idVista) => {
    vistaActual = idVista;

    // Antes de quitar la vista que hubiera, se le da la oportunidad de darse de
    // baja de los avisos a los que estuviera suscrita.
    destruirVista();
    vista.replaceChildren();

    for (const boton of menu.querySelectorAll('.area__menu-boton')) {
      const activo = boton.dataset.vista === idVista;
      boton.classList.toggle('area__menu-boton--activo', activo);
      boton.setAttribute('aria-pressed', String(activo));
    }

    const creada = idVista === null ? null : crearVista(seccionActual.id, idVista, contextoDeVistas());

    if (creada === null) {
      vista.appendChild(crearAviso(seccionActual));
      return;
    }

    vistaPropia = creada;
    vista.appendChild(creada.elemento);
  };

  /** Quita la vista que hubiera, dejando que suelte sus avisos. */
  const destruirVista = () => {
    if (vistaPropia !== null) {
      vistaPropia.destruir();
      vistaPropia = null;
    }
  };

  /**
   * Lo que una vista puede pedirle al área.
   *
   * `irAVista` lo usa, por ejemplo, la lista de miembros para abrir la ficha de
   * uno al hacer doble clic.
   */
  const contextoDeVistas = () => ({
    irAVista: (idVista) => {
      mostrarVista(idVista);

      if (alCambiarSeccion !== undefined) {
        alCambiarSeccion();
      }
    }
  });

  // Si el área desaparece (por ejemplo al recargar la disposición), su vista se
  // da de baja de los avisos que tuviera.
  contenedor.on('destroy', destruirVista);

  selector.addEventListener('change', () => {
    mostrarSeccion(selector.value);

    if (alCambiarSeccion !== undefined) {
      alCambiarSeccion();
    }
  });

  mostrarSeccion(textoOTextoPorDefecto(datos.seccion, SECCION_POR_DEFECTO), datos.vista);
  mostrarMedida();
  contenedor.on('resize', mostrarMedida);
  elemento.addEventListener(EVENTO_ESCALA, mostrarMedida);

  // Golden Layout pide aquí el estado del componente cada vez que guarda la
  // disposición, así que la sección, la vista y el zoom viajan con el área:
  // sobreviven a recargar la página y a dividir o fundir.
  contenedor.stateRequestEvent = () => ({
    ...datos,
    seccion: seccionActual.id,
    vista: vistaActual,
    escala: leerEscala(elemento)
  });

  elemento.append(barra, menu, vista, medida);
  contenedor.element.appendChild(elemento);

  return elemento;
}

/** Aviso para las secciones que todavía no tienen vistas propias. */
function crearAviso(seccion) {
  const aviso = document.createElement('div');
  aviso.className = 'area__aviso';

  const titulo = document.createElement('p');
  titulo.className = 'area__titulo';
  titulo.textContent = seccion.titulo;

  const texto = document.createElement('p');
  texto.className = 'area__descripcion';
  texto.textContent = `${seccion.descripcion}. Esta sección todavía no tiene vistas propias.`;

  aviso.append(titulo, texto);
  return aviso;
}

/** Crea la barra con el desplegable de secciones. */
function crearBarraDeSeccion() {
  const barra = document.createElement('div');
  barra.className = 'area__barra';

  const selector = document.createElement('select');
  selector.className = 'area__selector';
  selector.title = 'Sección que muestra el área';
  selector.setAttribute('aria-label', 'Sección que muestra el área');

  for (const seccion of SECCIONES) {
    const opcion = document.createElement('option');
    opcion.value = seccion.id;
    opcion.textContent = seccion.titulo;
    selector.appendChild(opcion);
  }

  barra.appendChild(selector);
  return barra;
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
