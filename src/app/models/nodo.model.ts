/** Elemento del flujo: actividad, gateway o evento (un solo tipo en la API: NodoFlujo). */
export type TipoNodo = 'ACTIVIDAD' | 'GATEWAY' | 'EVENTO_INICIO' | 'EVENTO_FIN' | 'MESSAGE_THROW' | 'MESSAGE_CATCH';
/** Clase de actividad (tarea de usuario, manual, de servicio, etc.). */
export type TipoActividad = 'TAREA' | 'USUARIO' | 'MANUAL' | 'SERVICIO' | 'ENVIO' | 'RECEPCION';
/** Clase de gateway: exclusivo (uno), paralelo (todos) o inclusivo (uno o varios). */
export type TipoGateway = 'EXCLUSIVO' | 'PARALELO' | 'INCLUSIVO';
/** Momento del evento dentro del flujo. */
export type VarianteEvento = 'INICIO' | 'INTERMEDIO' | 'FIN';

/** Un elemento del diagrama con su tipo y su posición en el lienzo. */
export interface Nodo {
  /** Identificador del nodo. */
  id: number;
  /** Pool en el que está dibujado. */
  poolId: number;
  /** Lane en la que está, o null si no está en ninguna. */
  laneId: number | null;
  /** Qué clase de nodo es. */
  tipo: TipoNodo;
  /** Nombre visible (puede no tener). */
  nombre: string | null;
  /** Solo se llena si el nodo es una actividad. */
  tipoActividad: TipoActividad | null;
  /** Solo se llena si el nodo es un gateway. */
  tipoGateway: TipoGateway | null;
  /** Solo se llena si el nodo es un evento. */
  variante: VarianteEvento | null;
  /** Posición horizontal en el lienzo. */
  posX: number;
  /** Posición vertical en el lienzo. */
  posY: number;
}

/** HU-08 y HU-09: la actividad vive en una lane, que define su responsable. */
export interface ActividadRequest {
  /** Nombre de la actividad. */
  nombre: string;
  /** Clase de actividad. */
  tipoActividad: TipoActividad;
  /** Lane donde se coloca. */
  laneId: number | null;
  /** Posición horizontal. */
  posX: number;
  /** Posición vertical. */
  posY: number;
}

/** HU-14 y HU-15: el gateway parte o une caminos. */
export interface GatewayRequest {
  /** Nombre opcional del gateway. */
  nombre: string | null;
  /** Clase de gateway. */
  tipoGateway: TipoGateway;
  /** Lane donde se coloca. */
  laneId: number | null;
  /** Posición horizontal. */
  posX: number;
  /** Posición vertical. */
  posY: number;
}

/** Eventos de inicio y de fin del flujo (el validador exige al menos uno de cada uno). */
export interface EventoRequest {
  /** Si es evento de inicio o de fin. */
  tipo: 'INICIO' | 'FIN';
  /** Nombre opcional del evento. */
  nombre: string | null;
  /** Lane donde se coloca. */
  laneId: number | null;
  /** Posición horizontal. */
  posX: number;
  /** Posición vertical. */
  posY: number;
}
