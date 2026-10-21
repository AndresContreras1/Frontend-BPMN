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
