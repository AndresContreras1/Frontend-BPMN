import { Arco } from './arco.model';
import { Mensaje } from './mensaje.model';
import { Nodo } from './nodo.model';
import { Pool } from './pool.model';
import { Proceso } from './proceso.model';

/** Gravedad de una advertencia: ERROR bloquea la publicación y AVISO solo informa. */
export type Severidad = 'ERROR' | 'AVISO';

/** Resultado del validador del proceso: el ERROR impide publicar; el AVISO solo informa. */
export interface Advertencia {
  /** Código interno que identifica la regla que se incumplió. */
  codigo: string;
  /** Si es ERROR o AVISO. */
  severidad: Severidad;
  /** Texto que se le muestra al usuario. */
  mensaje: string;
  /** Id del elemento del diagrama afectado, o null si aplica a todo el proceso. */
  elementoId: number | null;
}

/** HU-07: el diagrama completo del proceso. */
export interface Diagrama {
  /** Datos generales del proceso. */
  proceso: Proceso;
  /** Participantes (con sus lanes). */
  pools: Pool[];
  /** Actividades, gateways y eventos. */
  nodos: Nodo[];
  /** Flujos de secuencia entre nodos. */
  arcos: Arco[];
  /** Flujos de mensaje entre pools. */
  mensajes: Mensaje[];
  /** Problemas detectados por el validador. */
  advertencias: Advertencia[];
}

/** Lo que pasaría al eliminar un elemento: arcos que se van con él y advertencias que quedarían. */
export interface Impacto {
  /** Ids de los arcos que se borrarían junto con el elemento. */
  arcosQueSeEliminan: number[];
  /** Advertencias que aparecerían después de borrar. */
  advertencias: Advertencia[];
}

/** Respuesta al guardar un gateway: el gateway y las advertencias resultantes. */
export interface GatewayGuardado {
  /** Gateway ya guardado. */
  gateway: Nodo;
  /** Advertencias del diagrama tras el cambio. */
  advertencias: Advertencia[];
}

/** Respuesta al guardar un mensaje: el mensaje y las advertencias resultantes. */
export interface MensajeGuardado {
  /** Mensaje ya guardado. */
  mensaje: Mensaje;
  /** Advertencias del diagrama tras el cambio. */
  advertencias: Advertencia[];
}
