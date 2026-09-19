// Configuración de la disposición de áreas.
//
// El primer paso pedido es una fila raíz con tres columnas: 1 + 2 + 2 áreas.

// Tipo de componente registrado para rellenar cada área.
export const TIPO_COMPONENTE_AREA = 'area';

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
  return {
    dimensions: { ...DIMENSIONES },
    settings: { ...AJUSTES },
    header: { ...ENCABEZADO },
    root: {
      type: 'row',
      content: [
        crearArea(`${PREFIJO_ID_AREA}1`, 'Área 1', 'Columna 1 · área única', '20%'),
        {
          type: 'column',
          size: '40%',
          content: [
            crearArea(`${PREFIJO_ID_AREA}2`, 'Área 2', 'Columna 2 · área superior', '50%'),
            crearArea(`${PREFIJO_ID_AREA}3`, 'Área 3', 'Columna 2 · área inferior', '50%')
          ]
        },
        {
          type: 'column',
          size: '40%',
          content: [
            crearArea(`${PREFIJO_ID_AREA}4`, 'Área 4', 'Columna 3 · área superior', '50%'),
            crearArea(`${PREFIJO_ID_AREA}5`, 'Área 5', 'Columna 3 · área inferior', '50%')
          ]
        }
      ]
    }
  };
}

/** Configuración de una de las áreas de relleno. */
function crearArea(id, titulo, descripcion, tamano) {
  return {
    type: 'component',
    componentType: TIPO_COMPONENTE_AREA,
    id,
    title: titulo,
    size: tamano,
    componentState: { id, titulo, descripcion }
  };
}
