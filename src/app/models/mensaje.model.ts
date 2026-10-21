import { Nodo, VarianteEvento } from './nodo.model';

/** Si el mensaje se envía (ENVIO) o se espera (RECEPCION). */
export type DireccionMensaje = 'ENVIO' | 'RECEPCION';
/** Cómo se entrega un mensaje a un sistema externo. */
export type TipoDestinoExterno = 'CORREO' | 'SERVICIO_WEB' | 'COLA';
/** Qué hacer si falla el envío al sistema externo. */
export type PoliticaFallo = 'CONTINUAR' | 'DERIVAR_A_ACTIVIDAD' | 'FINALIZAR_PROCESO';
/** Qué hacer si llega un mensaje y no existe un caso al que pertenezca. */
export type AccionSinCaso = 'DESCARTAR' | 'INICIAR_CASO_NUEVO';
/** Tipos de dato que puede tener un campo del mensaje. */
export type TipoDato = 'TEXTO' | 'NUMERO' | 'DECIMAL' | 'FECHA' | 'BOOLEANO';

/** Un campo (dato) que viaja dentro del mensaje. */
export interface CampoMensaje {
  /** Nombre del campo. */
  nombre: string;
  /** Tipo de dato del campo. */
  tipoDato: TipoDato;
}

/** HU-25 a HU-28: flujo de mensaje (línea punteada) entre pools. */
export interface Mensaje {
  /** Identificador del mensaje. */
  id: number;
  /** Nodo del diagrama (el evento o tarea) que representa el mensaje. */
  nodo: Nodo;
  /** Si se envía o se recibe. */
  direccion: DireccionMensaje;
  /** Nombre del mensaje. */
  nombre: string;
  /** Pool desde el que sale. */
  poolOrigenId: number;
  /** Pool al que llega (null si aún no tiene). */
  poolDestinoId: number | null;
  /** Nodo que recibe el mensaje, si ya está conectado. */
  nodoDestinoId: number | null;
  /** Forma de entrega cuando el destino es externo. */
  tipoDestino: TipoDestinoExterno | null;
  /** Momento en que se envía (texto libre). */
  momento: string | null;
  /** Qué hacer si falla el envío. */
  politicaFallo: PoliticaFallo | null;
  /** Actividad que maneja el error cuando la política es derivar. */
  actividadManejoErrorId: number | null;
  /** True si el mensaje llega desde fuera del sistema. */
  origenExterno: boolean;
  /** Campo que identifica a qué caso pertenece el mensaje. */
  claveCorrelacion: string | null;
  /** Qué hacer si no se encuentra el caso. */
  accionSinCaso: AccionSinCaso | null;
  /** Campos que contiene el mensaje. */
  campos: CampoMensaje[];
  /** Ids de las actividades que usan los datos de este mensaje. */
  actividadesQueUsanIds: number[];
}

/** HU-25: Message Throw (intermedio o de fin) hacia otro pool. */
export interface MensajeThrowRequest {
  /** Pool donde se coloca el evento. */
  poolId: number;
  /** Lane donde se coloca (puede ser null). */
  laneId: number | null;
  /** Nombre del mensaje. */
  nombre: string;
  /** Si el evento es intermedio o de fin. */
  variante: VarianteEvento;
  /** Pool al que se envía. */
  poolDestinoId: number;
  /** Campos del mensaje. */
  campos: CampoMensaje[];
  /** Clave de correlación (opcional). */
  claveCorrelacion: string | null;
  /** Posición horizontal. */
  posX: number;
  /** Posición vertical. */
  posY: number;
}

/** HU-27: Message Catch (de inicio o intermedio) que espera un mensaje. */
export interface MensajeCatchRequest {
  /** Pool donde se coloca el evento. */
  poolId: number;
  /** Lane donde se coloca (puede ser null). */
  laneId: number | null;
  /** Nombre del mensaje. */
  nombre: string;
  /** Si el evento es de inicio o intermedio. */
  variante: VarianteEvento;
  /** True si el mensaje llega desde fuera del sistema. */
  origenExterno: boolean;
  /** Campos que se esperan en el mensaje. */
  campos: CampoMensaje[];
  /** Actividades que usarán los datos recibidos. */
  actividadesQueUsanIds: number[];
  /** Clave de correlación (opcional). */
  claveCorrelacion: string | null;
  /** Posición horizontal. */
  posX: number;
  /** Posición vertical. */
  posY: number;
}

/** HU-26: notificación a un sistema externo (pool de caja negra), como evento o como tarea. */
export interface EnvioExternoRequest {
  /** Pool donde se coloca el elemento. */
  poolId: number;
  /** Lane donde se coloca (puede ser null). */
  laneId: number | null;
  /** Si el envío se dibuja como evento o como tarea. */
  elemento: 'EVENTO' | 'TAREA';
  /** Nombre del mensaje. */
  nombre: string;
  /** Nombre de la tarea cuando el elemento es una tarea. */
  nombreTarea: string | null;
  /** Pool externo al que se notifica. */
  poolDestinoId: number;
  /** Cómo se entrega el mensaje. */
  tipoDestino: TipoDestinoExterno;
  /** Campos del mensaje. */
  campos: CampoMensaje[];
  /** Momento del envío (texto libre). */
  momento: string | null;
  /** Qué hacer si el envío falla. */
  politicaFallo: PoliticaFallo;
  /** Actividad que maneja el error, si la política es derivar. */
  actividadManejoErrorId: number | null;
  /** Posición horizontal. */
  posX: number;
  /** Posición vertical. */
  posY: number;
}

/** Edición de un mensaje: lo que va en null no cambia. */
export interface MensajeActualizacionRequest {
  /** Nuevo nombre (obligatorio). */
  nombre: string;
  /** Nueva variante del evento. */
  variante?: VarianteEvento | null;
  /** Nuevo pool destino. */
  poolDestinoId?: number | null;
  /** Nuevo tipo de destino externo. */
  tipoDestino?: TipoDestinoExterno | null;
  /** Nuevo momento de envío. */
  momento?: string | null;
  /** Nueva política de fallo. */
  politicaFallo?: PoliticaFallo | null;
  /** Nueva actividad de manejo de error. */
  actividadManejoErrorId?: number | null;
  /** Nuevo valor de origen externo. */
  origenExterno?: boolean | null;
  /** Nueva lista de campos. */
  campos?: CampoMensaje[] | null;
  /** Nuevas actividades que usan el mensaje. */
  actividadesQueUsanIds?: number[] | null;
  /** Nueva posición horizontal. */
  posX?: number | null;
  /** Nueva posición vertical. */
  posY?: number | null;
}

/** HU-28: clave que une el mensaje con el caso correcto del proceso receptor. */
export interface CorrelacionRequest {
  /** Nombre del campo usado como clave. */
  claveCorrelacion: string;
  /** Qué hacer si no existe un caso con esa clave. */
  accionSinCaso: AccionSinCaso;
}
