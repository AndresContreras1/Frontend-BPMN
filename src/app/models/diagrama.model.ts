import { Arco } from './arco.model';
import { Mensaje } from './mensaje.model';
import { Nodo } from './nodo.model';
import { Pool } from './pool.model';
import { Proceso } from './proceso.model';

export type Severidad = 'ERROR' | 'AVISO';

/** Resultado del validador del proceso: el ERROR impide publicar; el AVISO solo informa. */
export interface Advertencia {
  codigo: string;
  severidad: Severidad;
  mensaje: string;
  elementoId: number | null;
}

/** HU-07: el diagrama completo del proceso. */
export interface Diagrama {
  proceso: Proceso;
  pools: Pool[];
  nodos: Nodo[];
  arcos: Arco[];
  mensajes: Mensaje[];
  advertencias: Advertencia[];
}

/** Lo que pasaría al eliminar un elemento: arcos que se van con él y advertencias que quedarían. */
export interface Impacto {
  arcosQueSeEliminan: number[];
  advertencias: Advertencia[];
}

export interface GatewayGuardado {
  gateway: Nodo;
  advertencias: Advertencia[];
}

export interface MensajeGuardado {
  mensaje: Mensaje;
  advertencias: Advertencia[];
}
