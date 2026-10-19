/** HU-07: tipo de cambio que guarda el historial del proceso. */
export type TipoCambio = 'CREACION' | 'EDICION' | 'CAMBIO_ESTADO' | 'ELIMINACION' | 'COMPARTICION';

/** Un cambio del proceso o de su diagrama: quién, cuándo y qué. */
export interface HistorialCambio {
  id: number;
  fecha: string;
  usuario: string;
  tipo: TipoCambio;
  elemento: string;
  elementoId: number | null;
  detalle: string;
  advertencias: string[];
}
