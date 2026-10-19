import { Nodo, VarianteEvento } from './nodo.model';

export type DireccionMensaje = 'ENVIO' | 'RECEPCION';
export type TipoDestinoExterno = 'CORREO' | 'SERVICIO_WEB' | 'COLA';
export type PoliticaFallo = 'CONTINUAR' | 'DERIVAR_A_ACTIVIDAD' | 'FINALIZAR_PROCESO';
export type AccionSinCaso = 'DESCARTAR' | 'INICIAR_CASO_NUEVO';
export type TipoDato = 'TEXTO' | 'NUMERO' | 'DECIMAL' | 'FECHA' | 'BOOLEANO';

export interface CampoMensaje {
  nombre: string;
  tipoDato: TipoDato;
}

/** HU-25 a HU-28: flujo de mensaje (línea punteada) entre pools. */
export interface Mensaje {
  id: number;
  nodo: Nodo;
  direccion: DireccionMensaje;
  nombre: string;
  poolOrigenId: number;
  poolDestinoId: number | null;
  nodoDestinoId: number | null;
  tipoDestino: TipoDestinoExterno | null;
  momento: string | null;
  politicaFallo: PoliticaFallo | null;
  actividadManejoErrorId: number | null;
  origenExterno: boolean;
  claveCorrelacion: string | null;
  accionSinCaso: AccionSinCaso | null;
  campos: CampoMensaje[];
  actividadesQueUsanIds: number[];
}

/** HU-25: Message Throw (intermedio o de fin) hacia otro pool. */
export interface MensajeThrowRequest {
  poolId: number;
  laneId: number | null;
  nombre: string;
  variante: VarianteEvento;
  poolDestinoId: number;
  campos: CampoMensaje[];
  claveCorrelacion: string | null;
  posX: number;
  posY: number;
}

/** HU-27: Message Catch (de inicio o intermedio) que espera un mensaje. */
export interface MensajeCatchRequest {
  poolId: number;
  laneId: number | null;
  nombre: string;
  variante: VarianteEvento;
  origenExterno: boolean;
  campos: CampoMensaje[];
  actividadesQueUsanIds: number[];
  claveCorrelacion: string | null;
  posX: number;
  posY: number;
}

/** HU-26: notificación a un sistema externo (pool de caja negra), como evento o como tarea. */
export interface EnvioExternoRequest {
  poolId: number;
  laneId: number | null;
  elemento: 'EVENTO' | 'TAREA';
  nombre: string;
  nombreTarea: string | null;
  poolDestinoId: number;
  tipoDestino: TipoDestinoExterno;
  campos: CampoMensaje[];
  momento: string | null;
  politicaFallo: PoliticaFallo;
  actividadManejoErrorId: number | null;
  posX: number;
  posY: number;
}

/** Edición de un mensaje: lo que va en null no cambia. */
export interface MensajeActualizacionRequest {
  nombre: string;
  variante?: VarianteEvento | null;
  poolDestinoId?: number | null;
  tipoDestino?: TipoDestinoExterno | null;
  momento?: string | null;
  politicaFallo?: PoliticaFallo | null;
  actividadManejoErrorId?: number | null;
  origenExterno?: boolean | null;
  campos?: CampoMensaje[] | null;
  actividadesQueUsanIds?: number[] | null;
  posX?: number | null;
  posY?: number | null;
}

/** HU-28: clave que une el mensaje con el caso correcto del proceso receptor. */
export interface CorrelacionRequest {
  claveCorrelacion: string;
  accionSinCaso: AccionSinCaso;
}
