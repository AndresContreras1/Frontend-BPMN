import { Proceso } from './proceso.model';

export type TipoPool = 'PROPIETARIO' | 'CLIENTE' | 'PROVEEDOR' | 'SISTEMA_EXTERNO';
export type PermisoEstructura = 'SOLO_ADMINISTRADOR' | 'ADMINISTRADOR_Y_EDITOR';
export type TipoNodo = 'ACTIVIDAD' | 'GATEWAY' | 'EVENTO_INICIO' | 'EVENTO_FIN' | 'MESSAGE_THROW' | 'MESSAGE_CATCH';
export type TipoActividad = 'TAREA' | 'USUARIO' | 'MANUAL' | 'SERVICIO' | 'ENVIO' | 'RECEPCION';
export type TipoGateway = 'EXCLUSIVO' | 'PARALELO' | 'INCLUSIVO';
export type VarianteEvento = 'INICIO' | 'INTERMEDIO' | 'FIN';
export type DireccionMensaje = 'ENVIO' | 'RECEPCION';
export type TipoDestinoExterno = 'CORREO' | 'SERVICIO_WEB' | 'COLA';
export type PoliticaFallo = 'CONTINUAR' | 'DERIVAR_A_ACTIVIDAD' | 'FINALIZAR_PROCESO';
export type AccionSinCaso = 'DESCARTAR' | 'INICIAR_CASO_NUEVO';
export type TipoDato = 'TEXTO' | 'NUMERO' | 'DECIMAL' | 'FECHA' | 'BOOLEANO';
export type Severidad = 'ERROR' | 'AVISO';

export interface Lane {
  id: number;
  poolId: number;
  rolProcesoId: number;
  nombre: string;
  orden: number;
}

/** HU-21: participante del proceso; la caja negra no tiene elementos internos. */
export interface Pool {
  id: number;
  procesoId: number;
  nombre: string;
  tipo: TipoPool;
  cajaNegra: boolean;
  orden: number;
  permisoEstructura: PermisoEstructura;
  lanes: Lane[];
}

/** Actividad, gateway o evento del flujo. */
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

/** HU-11: flujo de secuencia (línea continua) dentro de un pool. */
export interface Arco {
  id: number;
  origenId: number;
  destinoId: number;
  etiqueta: string | null;
  condicion: string | null;
}

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
