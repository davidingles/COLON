// Vistas de la sección «Familia».

import {
  alCambiarMiembros,
  borrarMiembro,
  calcularEstadisticas,
  estadoDeMiembros,
  filtrarMiembros,
  guardarMiembro,
  leerMiembros
} from './miembros.js';
import { alCambiarSeleccion, obtenerSeleccion, seleccionar } from './seleccion.js';

// Identificador de la sección. Es también la clave con la que se guarda qué
// miembro está seleccionado.
const SECCION = 'familia';

// Parentescos que se pueden elegir en el formulario.
const PARENTESCOS = ['', 'Padre', 'Madre', 'Hijo/a', 'Hermano/a', 'Abuelo/a', 'Nieto/a', 'Tío/a', 'Otro'];

/**
 * Crea la vista indicada.
 *
 * Devuelve `{ elemento, destruir }`, o null si esta sección no tiene esa vista.
 * El área llama a `destruir` antes de quitar la vista, para que se den de baja
 * los avisos a los que se haya suscrito.
 */
export function crearVista(idVista, contexto) {
  switch (idVista) {
    case 'nuevo-miembro':
      return crearFormularioDeMiembro();
    case 'miembros':
      return crearListaDeMiembros(contexto);
    case 'familiar':
      return crearFichaDeFamiliar();
    default:
      return null;
  }
}

/**
 * Datos, estadísticas y contenido del miembro seleccionado.
 *
 * No tiene selector propio: muestra el miembro que esté seleccionado en la
 * vista «Miembros», aunque esté en otra área, y se actualiza solo cuando cambia.
 */
function crearFichaDeFamiliar() {
  const contenedor = document.createElement('div');
  contenedor.className = 'familiar';

  const detalle = document.createElement('div');
  detalle.className = 'familiar__detalle';

  /** Vuelve a pintar la ficha con el miembro que esté seleccionado. */
  const pintar = () => {
    detalle.replaceChildren();

    const { cargando, error } = estadoDeMiembros();

    if (cargando) {
      detalle.appendChild(crearMensaje('Cargando la ficha…'));
      return;
    }

    if (error !== null) {
      detalle.appendChild(crearMensaje(error, 'error'));
      return;
    }

    const miembros = leerMiembros();
    const seleccionado = obtenerSeleccion(SECCION);
    const miembro = miembros.find((candidato) => candidato.id === seleccionado) ?? null;

    if (miembro === null) {
      detalle.appendChild(crearAvisoDeSeleccion({ hayMiembros: miembros.length > 0, habiaSeleccion: seleccionado !== null }));
      return;
    }

    const encabezado = document.createElement('p');
    encabezado.className = 'familiar__seleccionado';
    encabezado.textContent = miembro.nombre;

    detalle.append(
      encabezado,
      crearBloqueDeDatos('Datos', datosDelMiembro(miembro)),
      crearBloqueDeDatos('Estadísticas', estadisticasDelMiembro(miembro)),
      crearBloqueDeContenido('Archivos', 'Todavía no hay archivos de este miembro.'),
      crearBloqueDeContenido('Fotos', 'Todavía no hay fotos de este miembro.')
    );
  };

  const dejarDeEscucharDatos = alCambiarMiembros(pintar);
  const dejarDeEscucharSeleccion = alCambiarSeleccion(SECCION, pintar);

  pintar();
  contenedor.appendChild(detalle);

  return {
    elemento: contenedor,
    destruir: () => {
      dejarDeEscucharDatos();
      dejarDeEscucharSeleccion();
    }
  };
}

/** Explica por qué no hay ficha que enseñar. */
function crearAvisoDeSeleccion({ hayMiembros, habiaSeleccion }) {
  const aviso = crearMensaje(null);

  if (!hayMiembros) {
    aviso.textContent = 'Todavía no hay ningún miembro. Créalo en «Nuevo miembro».';
  } else if (habiaSeleccion) {
    aviso.textContent = 'El miembro seleccionado ya no existe. Elige otro en «Miembros».';
  } else {
    aviso.textContent = 'Elige un miembro en «Miembros» para ver aquí su ficha.';
  }

  return aviso;
}

/** Mensaje suelto dentro de una vista. Con `tipo` se pinta como aviso o error. */
function crearMensaje(texto, tipo = '') {
  const parrafo = document.createElement('p');
  parrafo.className = 'area__descripcion';

  if (texto !== null) {
    parrafo.textContent = texto;
  }

  if (tipo !== '') {
    parrafo.dataset.tipo = tipo;
  }

  return parrafo;
}

/** Apartado de contenido que todavía no tiene nada. */
function crearBloqueDeContenido(titulo, mensaje) {
  const bloque = document.createElement('section');
  bloque.className = 'bloque';

  const encabezado = document.createElement('h3');
  encabezado.className = 'bloque__titulo';
  encabezado.textContent = titulo;

  const texto = document.createElement('p');
  texto.className = 'bloque__vacio';
  texto.textContent = mensaje;

  bloque.append(encabezado, texto);
  return bloque;
}

/** Pares de etiqueta y valor con los datos del miembro. */
function datosDelMiembro(miembro) {
  const estadisticas = calcularEstadisticas(miembro);

  return [
    ['Nombre', miembro.nombre],
    ['Parentesco', miembro.parentesco || 'Sin indicar'],
    [
      'Nacimiento',
      estadisticas === null ? 'Sin indicar' : formatearFecha(estadisticas.nacimiento)
    ],
    ['Teléfono', miembro.telefono || 'Sin indicar'],
    ['Correo', miembro.correo || 'Sin indicar'],
    ['Notas', miembro.notas || 'Sin notas']
  ];
}

/** Pares de etiqueta y valor con lo que se deduce de sus datos. */
function estadisticasDelMiembro(miembro) {
  const estadisticas = calcularEstadisticas(miembro);

  if (estadisticas === null) {
    return [['Edad', 'Falta la fecha de nacimiento']];
  }

  const { edad, proximo, dias, signo } = estadisticas;
  const cuando = formatearFecha(proximo);

  return [
    ['Edad', `${edad} ${edad === 1 ? 'año' : 'años'}`],
    ['Próximo cumpleaños', `${cuando} (${textoDeDias(dias)})`],
    ['Signo', signo],
    ['Miembros en total', `${leerMiembros().length}`]
  ];
}

/** Texto de los días que faltan para una fecha. */
function textoDeDias(dias) {
  if (dias === 0) {
    return 'es hoy';
  }

  return dias === 1 ? 'falta 1 día' : `faltan ${dias} días`;
}

/** Bloque de datos con un título y una lista de pares etiqueta/valor. */
function crearBloqueDeDatos(titulo, pares) {
  const bloque = document.createElement('section');
  bloque.className = 'bloque';

  const encabezado = document.createElement('h3');
  encabezado.className = 'bloque__titulo';
  encabezado.textContent = titulo;

  const lista = document.createElement('dl');
  lista.className = 'bloque__lista';

  for (const [etiqueta, valor] of pares) {
    const termino = document.createElement('dt');
    termino.textContent = etiqueta;

    const definicion = document.createElement('dd');
    definicion.textContent = valor;

    lista.append(termino, definicion);
  }

  bloque.append(encabezado, lista);
  return bloque;
}

/** Fecha en formato largo, en español. */
function formatearFecha(fecha) {
  return fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Formulario para dar de alta un miembro. */
function crearFormularioDeMiembro() {
  const formulario = document.createElement('form');
  formulario.className = 'formulario';

  // Los avisos del navegador se desactivan para validar aquí y poder explicar
  // qué falta en el idioma y el lugar que toca.
  formulario.noValidate = true;

  const campos = [
    { nombre: 'nombre', etiqueta: 'Nombre completo', tipo: 'text', obligatorio: true, ancho: true },
    { nombre: 'nacimiento', etiqueta: 'Fecha de nacimiento', tipo: 'date' },
    { nombre: 'parentesco', etiqueta: 'Parentesco', tipo: 'select', opciones: PARENTESCOS },
    { nombre: 'telefono', etiqueta: 'Teléfono', tipo: 'tel' },
    { nombre: 'correo', etiqueta: 'Correo', tipo: 'email' },
    { nombre: 'notas', etiqueta: 'Notas', tipo: 'textarea', ancho: true }
  ];

  const controles = new Map();

  for (const campo of campos) {
    const grupo = document.createElement('div');
    grupo.className = campo.ancho ? 'campo campo--ancho' : 'campo';

    const etiqueta = document.createElement('label');
    etiqueta.className = 'campo__etiqueta';
    etiqueta.textContent = campo.obligatorio ? `${campo.etiqueta} *` : campo.etiqueta;
    etiqueta.htmlFor = `miembro-${campo.nombre}`;

    controles.set(campo.nombre, crearControl(campo));

    grupo.append(etiqueta, controles.get(campo.nombre));
    formulario.appendChild(grupo);
  }

  const pie = document.createElement('div');
  pie.className = 'formulario__pie';

  const boton = document.createElement('button');
  boton.className = 'boton';
  boton.type = 'submit';
  boton.textContent = 'Guardar miembro';

  const aviso = document.createElement('p');
  aviso.className = 'formulario__aviso';
  aviso.setAttribute('role', 'status');

  pie.append(boton, aviso);
  formulario.appendChild(pie);

  formulario.addEventListener('submit', (evento) => {
    evento.preventDefault();
    enviar();
  });

  /** Recoge los datos, los valida y los guarda. */
  async function enviar() {
    const datos = {};
    for (const [nombre, control] of controles) {
      datos[nombre] = control.value;
    }

    const problema = validar(datos);
    if (problema !== null) {
      aviso.textContent = problema;
      aviso.dataset.tipo = 'error';
      return;
    }

    // El guardado va al servidor, así que puede tardar o fallar.
    boton.disabled = true;
    aviso.textContent = 'Guardando…';
    aviso.dataset.tipo = '';

    try {
      const miembro = await guardarMiembro(datos);
      formulario.reset();

      // El recién creado queda seleccionado: aparece destacado en «Miembros» y su
      // ficha ya sale en «Familiar».
      seleccionar(SECCION, miembro.id);

      aviso.textContent = `Guardado «${miembro.nombre}». Está en la vista «Miembros».`;
      aviso.dataset.tipo = 'ok';
    } catch (error) {
      aviso.textContent = error.message;
      aviso.dataset.tipo = 'error';
    } finally {
      boton.disabled = false;
    }
  }

  // El formulario no se suscribe a nada, así que no tiene nada que soltar.
  return { elemento: formulario, destruir: () => {} };
}

/** Crea el control de un campo. */
function crearControl(campo) {
  if (campo.tipo === 'select') {
    const selector = document.createElement('select');
    selector.className = 'campo__control';
    selector.id = `miembro-${campo.nombre}`;

    for (const opcion of campo.opciones) {
      const elemento = document.createElement('option');
      elemento.value = opcion;
      elemento.textContent = opcion === '' ? 'Sin indicar' : opcion;
      selector.appendChild(elemento);
    }

    return selector;
  }

  if (campo.tipo === 'textarea') {
    const area = document.createElement('textarea');
    area.className = 'campo__control campo__control--area';
    area.id = `miembro-${campo.nombre}`;
    area.rows = 3;
    return area;
  }

  const entrada = document.createElement('input');
  entrada.className = 'campo__control';
  entrada.id = `miembro-${campo.nombre}`;
  entrada.type = campo.tipo;
  if (campo.tipo === 'text' || campo.tipo === 'tel') {
    entrada.autocomplete = 'off';
  }

  return entrada;
}

/** Devuelve el primer problema encontrado, o null si los datos valen. */
function validar(datos) {
  if (datos.nombre.trim() === '') {
    return 'El nombre es obligatorio.';
  }

  const correo = datos.correo.trim();
  if (correo !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return 'El correo no tiene un formato válido.';
  }

  return null;
}

/** Buscador y lista de todos los miembros. */
function crearListaDeMiembros(contexto) {
  const contenedor = document.createElement('div');
  contenedor.className = 'miembros';

  const buscador = document.createElement('input');
  buscador.className = 'miembros__buscador';
  buscador.type = 'search';
  buscador.placeholder = 'Buscar por nombre, parentesco o contacto';
  buscador.setAttribute('aria-label', 'Buscar miembros');

  const resumen = document.createElement('p');
  resumen.className = 'miembros__resumen';

  const lista = document.createElement('ul');
  lista.className = 'miembros__lista';

  /** Vuelve a pintar la lista con lo que haya en el buscador. */
  const pintar = () => {
    const { cargando, error } = estadoDeMiembros();
    const todos = leerMiembros();
    const encontrados = filtrarMiembros(todos, buscador.value);
    const seleccionado = obtenerSeleccion(SECCION);

    lista.replaceChildren();
    resumen.dataset.tipo = '';

    if (cargando) {
      resumen.textContent = 'Cargando miembros…';
      return;
    }

    if (error !== null) {
      // Es un error del servidor (o de conexión): mejor decirlo que enseñar una
      // lista vacía, que parecería que no hay ningún miembro.
      resumen.textContent = error;
      resumen.dataset.tipo = 'error';
      return;
    }

    if (todos.length === 0) {
      resumen.textContent = 'Todavía no hay ningún miembro. Créalo en «Nuevo miembro».';
    } else if (encontrados.length === 0) {
      resumen.textContent = `Ningún miembro coincide con «${buscador.value.trim()}».`;
    } else {
      resumen.textContent =
        encontrados.length === todos.length
          ? `${todos.length} ${todos.length === 1 ? 'miembro' : 'miembros'}.`
          : `${encontrados.length} de ${todos.length} miembros.`;
    }

    for (const miembro of encontrados) {
      lista.appendChild(crearFicha(miembro, { seleccionado: miembro.id === seleccionado, contexto }));
    }
  };

  buscador.addEventListener('input', pintar);

  // La lista se entera sola de los miembros que se añadan o se borren, aunque
  // vengan de otra área, y de los cambios de selección.
  const dejarDeEscucharDatos = alCambiarMiembros(pintar);
  const dejarDeEscucharSeleccion = alCambiarSeleccion(SECCION, pintar);

  pintar();
  contenedor.append(buscador, resumen, lista);

  return {
    elemento: contenedor,
    destruir: () => {
      dejarDeEscucharDatos();
      dejarDeEscucharSeleccion();
    }
  };
}

/** Ficha de un miembro dentro de la lista. */
function crearFicha(miembro, { seleccionado, contexto }) {
  const ficha = document.createElement('li');
  ficha.className = 'ficha';
  ficha.classList.toggle('ficha--seleccionada', seleccionado);
  ficha.tabIndex = 0;

  if (seleccionado) {
    ficha.setAttribute('aria-current', 'true');
  }

  /** Elige este miembro para las vistas que siguen la selección. */
  const elegir = () => seleccionar(SECCION, miembro.id);

  ficha.addEventListener('click', elegir);

  // Doble clic: además de elegirlo, se abre su ficha.
  ficha.addEventListener('dblclick', () => {
    elegir();
    contexto?.irAVista('familiar');
  });

  ficha.addEventListener('keydown', (evento) => {
    if (evento.key === 'Enter' || evento.key === ' ') {
      evento.preventDefault();
      elegir();
    }
  });

  const nombre = document.createElement('p');
  nombre.className = 'ficha__nombre';
  nombre.textContent = miembro.nombre;

  const detalles = [miembro.parentesco, miembro.nacimiento, miembro.telefono, miembro.correo]
    .filter((valor) => valor !== '')
    .join(' · ');

  const detalle = document.createElement('p');
  detalle.className = 'ficha__detalle';
  detalle.textContent = detalles === '' ? 'Sin más datos' : detalles;

  const borrar = document.createElement('button');
  borrar.className = 'ficha__borrar';
  borrar.type = 'button';
  borrar.textContent = '×';
  borrar.title = `Borrar a ${miembro.nombre}`;
  borrar.setAttribute('aria-label', `Borrar a ${miembro.nombre}`);
  borrar.addEventListener('click', async (evento) => {
    // Sin esto, borrar elegiría además al miembro que se acaba de quitar.
    evento.stopPropagation();

    try {
      await borrarMiembro(miembro.id);
    } catch (error) {
      // La lista se repinta sola con el error cuando falle el borrado.
      console.warn('No se ha podido borrar el miembro:', error.message);
    }
  });

  const texto = document.createElement('div');
  texto.className = 'ficha__texto';
  texto.append(nombre);

  if (miembro.notas !== '') {
    const notas = document.createElement('p');
    notas.className = 'ficha__notas';
    notas.textContent = miembro.notas;
    texto.appendChild(notas);
  }

  texto.appendChild(detalle);
  ficha.append(texto, borrar);

  return ficha;
}
