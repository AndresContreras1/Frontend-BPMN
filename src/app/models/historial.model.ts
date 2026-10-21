/** HU-07: tipo de cambio que guarda el historial del proceso. */
export type TipoCambio = 'CREACION' | 'EDICION' | 'CAMBIO_ESTADO' | 'ELIMINACION' | 'COMPARTICION';

/** Un cambio del proceso o de su diagrama: quién, cuándo y qué. */
export interface HistorialCambio {
  /** Identificador del registro del historial. */
  id: number;
  /** Fecha y hora del cambio (texto ISO). */
  fecha: string;
  /** Quién hizo el cambio. */
  usuario: string;
  /** Qué clase de cambio fue. */
  tipo: TipoCambio;
  /** Nombre del elemento que cambió. */
  elemento: string;
  /** Id del elemento, o null si no aplica. */
  elementoId: number | null;
  /** Descripción del cambio. */
  detalle: string;
  /** Advertencias que quedaron después del cambio. */
  advertencias: string[];
}
