// Configuración de la disposición de áreas.
//
// El primer paso pedido es una fila raíz con tres columnas: 1 + 2 + 2 áreas.

// Tipo de componente registrado para rellenar cada área.
export const TIPO_COMPONENTE_AREA = 'area';

// Secciones de la aplicación que puede mostrar un área.
//
// Funcionan como los editores de Blender: cada área elige la suya con el
// desplegable de su cabecera, y al dividir un área la nueva hereda la sección
// de la que sale.
//
// Cada sección trae su propio menú de vistas; las que todavía no tienen ninguna
// salen con un aviso en lugar de con una pantalla vacía.
export const SECCIONES = [
  {
    id: 'familia',
    titulo: 'Familia',
    descripcion: 'Datos y tareas de la familia',
    vistas: [
      { id: 'nuevo-miembro', titulo: 'Nuevo miembro' },
      { id: 'miembros', titulo: 'Miembros' },
      { id: 'familiar', titulo: 'Familiar' }
    ]
  },
  {
    id: 'vehiculos',
    titulo: 'Vehículos',
    descripcion: 'Vehículos, seguros y mantenimiento',
    vistas: []
  },
  {
    id: 'economia',
    titulo: 'Economía',
    descripcion: 'Ingresos, gastos y presupuestos',
    vistas: []
  },
  {
    id: 'trabajo',
    titulo: 'Trabajo',
    descripcion: 'Tareas y asuntos del trabajo',
    vistas: []
  }
];

export const SECCION_POR_DEFECTO = SECCIONES[0].id;

/** Devuelve la sección indicada, o la de por defecto si el identificador no vale. */
export function buscarSeccion(idSeccion) {
  return SECCIONES.find((seccion) => seccion.id === idSeccion) ?? SECCIONES[0];
}

/**
 * Devuelve la vista indicada de una sección.
 *
 * Si el identificador no vale se cae a la primera vista; si la sección no tiene
 * ninguna, devuelve null y el área enseña un aviso.
 */
export function buscarVista(seccion, idVista) {
  return seccion.vistas.find((vista) => vista.id === idVista) ?? seccion.vistas[0] ?? null;
}

// Límites y paso del zoom del contenido de un área (Ctrl + rueda del ratón).
export const ZOOM_POR_DEFECTO = 1;
export const ZOOM_MINIMO = 0.6;
export const ZOOM_MAXIMO = 2;
export const PASO_ZOOM = 0.1;

// Prefijo de los identificadores de área. El identificador se guarda en la
// configuración y en el propio DOM, y es lo que permite localizar un área
// cuando se divide o se funde.
export const PREFIJO_ID_AREA = 'area-';

// Lado (en píxeles) del cuadrado que se coloca en cada cruce de divisores y
// que permite arrastrar las dos líneas a la vez.
export const TAMANO_ESQUINA = 12;

// Lado (en píxeles) de las esquinas interiores de cada área, las que sirven
// para dividir y para fundir.
export const TAMANO_ESQUINA_AREA = 12;

// Separación (en píxeles) entre el vértice del área y su esquina interior.
// Tiene que ser mayor que la mitad de TAMANO_ESQUINA para no solaparse con el
// cuadrado del cruce, que sigue siendo el que redimensiona en dos ejes.
export const SEPARACION_ESQUINA_AREA = 12;

// Tamaños mínimos de un área, en píxeles. Los usa Golden Layout para no dejar
// ningún área por debajo, y el gesto de dividir los respeta igual: si la guía
// pidiera una mitad más pequeña, la librería recolocaría la línea al soltar.
//
// Los dos se quedaron en 60 px a propósito, en vez de en los 120 y 90 iniciales.
// Con los valores altos la división de las áreas pequeñas apenas se podía mover:
// la primera columna (157 px) no admitía dos mitades de 120, y al apilar solo se
// podía soltar entre el 46 % y el 54 % del alto. El precio es que ahora se pueden
// dejar áreas muy estrechas.
//
// Al apilar hay que tener en cuenta que el área incluye su pestaña: con 60 px de
// alto, quedan 30 para la pestaña y 30 de contenido.
export const MINIMO_ANCHO_AREA = 60;
export const MINIMO_ALTO_AREA = 60;

// Medidas de la disposición, según la API pública de Golden Layout.
//
// borderWidth es el grosor real del divisor y borderGrabWidth la zona sensible
// al ratón: al ser mayor, el asa sobresale unos píxeles a cada lado y resulta
// más fácil acertar que con el grosor real.
export const DIMENSIONES = {
  borderWidth: 6,
  borderGrabWidth: 14,
  headerHeight: 30,
  defaultMinItemWidth: `${MINIMO_ANCHO_AREA}px`,
  defaultMinItemHeight: `${MINIMO_ALTO_AREA}px`
};

// Opciones generales de comportamiento.
export const AJUSTES = {
  constrainDragToContainer: true,
  reorderEnabled: true,
  responsiveMode: 'none'
};

// El encabezado se queda con la pestaña del título y sin botones: en esta
// entrega las áreas son de relleno y no deben poder cerrarse ni maximizarse.
export const ENCABEZADO = {
  show: 'top',
  close: false,
  maximise: false,
  popout: false
};

/**
 * Crea una configuración nueva, sin estados guardados de por medio.
 * Se usa al arrancar por primera vez y al pulsar «Restablecer disposición».
 */
export function crearConfiguracionInicial() {
  return crearConfiguracion({
    type: 'row',
    content: [
      crearArea(`${PREFIJO_ID_AREA}1`, 'familia', '20%'),
      {
        type: 'column',
        size: '40%',
        content: [
          crearArea(`${PREFIJO_ID_AREA}2`, 'vehiculos', '50%'),
          crearArea(`${PREFIJO_ID_AREA}3`, 'economia', '50%')
        ]
      },
      {
        type: 'column',
        size: '40%',
        content: [
          crearArea(`${PREFIJO_ID_AREA}4`, 'trabajo', '50%'),
          crearArea(`${PREFIJO_ID_AREA}5`, 'familia', '50%')
        ]
      }
    ]
  });
}

/** Cuatro áreas iguales, una por sección. */
function crearDisposicionCuadricula() {
  return crearConfiguracion({
    type: 'column',
    content: [
      {
        type: 'row',
        size: '50%',
        content: [
          crearArea(`${PREFIJO_ID_AREA}1`, 'familia', '50%'),
          crearArea(`${PREFIJO_ID_AREA}2`, 'vehiculos', '50%')
        ]
      },
      {
        type: 'row',
        size: '50%',
        content: [
          crearArea(`${PREFIJO_ID_AREA}3`, 'economia', '50%'),
          crearArea(`${PREFIJO_ID_AREA}4`, 'trabajo', '50%')
        ]
      }
    ]
  });
}

/** Una sección a la izquierda y las otras tres apiladas a la derecha. */
function crearDisposicionPrincipal() {
  return crearConfiguracion({
    type: 'row',
    content: [
      crearArea(`${PREFIJO_ID_AREA}1`, 'familia', '25%'),
      {
        type: 'column',
        size: '75%',
        content: [
          crearArea(`${PREFIJO_ID_AREA}2`, 'vehiculos', '33.34%'),
          crearArea(`${PREFIJO_ID_AREA}3`, 'economia', '33.33%'),
          crearArea(`${PREFIJO_ID_AREA}4`, 'trabajo', '33.33%')
        ]
      }
    ]
  });
}

/** Las cuatro secciones en una fila. */
function crearDisposicionTira() {
  return crearConfiguracion({
    type: 'row',
    content: [
      crearArea(`${PREFIJO_ID_AREA}1`, 'familia', '25%'),
      crearArea(`${PREFIJO_ID_AREA}2`, 'vehiculos', '25%'),
      crearArea(`${PREFIJO_ID_AREA}3`, 'economia', '25%'),
      crearArea(`${PREFIJO_ID_AREA}4`, 'trabajo', '25%')
    ]
  });
}

// Disposiciones que se pueden aplicar de un clic desde la cabecera.
// El nombre es el texto del botón; la descripción, su ayuda emergente.
export const DISPOSICIONES_PREDEFINIDAS = [
  {
    nombre: '2×2',
    descripcion: 'Cuatro áreas iguales, una por sección',
    crear: crearDisposicionCuadricula
  },
  {
    nombre: '1+3',
    descripcion: 'Familia a la izquierda y tres secciones apiladas',
    crear: crearDisposicionPrincipal
  },
  {
    nombre: 'Fila',
    descripcion: 'Las cuatro secciones en una fila',
    crear: crearDisposicionTira
  }
];

/** Envuelve un árbol de áreas con los ajustes comunes a toda disposición. */
function crearConfiguracion(raiz) {
  return {
    dimensions: { ...DIMENSIONES },
    settings: { ...AJUSTES },
    header: { ...ENCABEZADO },
    root: raiz
  };
}

/** Configuración de una de las áreas: su identificador y la sección que muestra. */
function crearArea(id, idSeccion, tamano) {
  const seccion = buscarSeccion(idSeccion);

  return {
    type: 'component',
    componentType: TIPO_COMPONENTE_AREA,
    id,
    title: seccion.titulo,
    size: tamano,
    componentState: { id, seccion: seccion.id }
  };
}
