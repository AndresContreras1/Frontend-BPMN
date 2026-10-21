import { Nodo } from './nodo.model';

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
