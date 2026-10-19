/** Elemento del flujo: actividad, gateway o evento (un solo tipo en la API: NodoFlujo). */
export type TipoNodo = 'ACTIVIDAD' | 'GATEWAY' | 'EVENTO_INICIO' | 'EVENTO_FIN' | 'MESSAGE_THROW' | 'MESSAGE_CATCH';
export type TipoActividad = 'TAREA' | 'USUARIO' | 'MANUAL' | 'SERVICIO' | 'ENVIO' | 'RECEPCION';
export type TipoGateway = 'EXCLUSIVO' | 'PARALELO' | 'INCLUSIVO';
export type VarianteEvento = 'INICIO' | 'INTERMEDIO' | 'FIN';

export interface Nodo {
  id: number;
  poolId: number;
  laneId: number | null;
  tipo: TipoNodo;
  nombre: string | null;
  tipoActividad: TipoActividad | null;
  tipoGateway: TipoGateway | null;
  variante: VarianteEvento | null;
  posX: number;
  posY: number;
}

/** HU-08 y HU-09: la actividad vive en una lane, que define su responsable. */
export interface ActividadRequest {
  nombre: string;
  tipoActividad: TipoActividad;
  laneId: number | null;
  posX: number;
  posY: number;
}

/** HU-14 y HU-15: el gateway parte o une caminos. */
export interface GatewayRequest {
  nombre: string | null;
  tipoGateway: TipoGateway;
  laneId: number | null;
  posX: number;
  posY: number;
}

/** Eventos de inicio y de fin del flujo (el validador exige al menos uno de cada uno). */
export interface EventoRequest {
  tipo: 'INICIO' | 'FIN';
  nombre: string | null;
  laneId: number | null;
  posX: number;
  posY: number;
}
