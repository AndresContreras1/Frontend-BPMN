import { Advertencia, Severidad } from '../../models/diagrama.model';

/** A qué apunta elementoId según el código del validador del backend. */
export type TipoElemento = 'pool' | 'arco' | 'nodo';

const CODIGOS_DE_POOL = new Set(['SIN_INICIO', 'SIN_FIN', 'CAJA_NEGRA_CON_ELEMENTOS']);
const CODIGOS_DE_ARCO = new Set(['CONDICION_FALTANTE']);

export function tipoDeElemento(advertencia: Advertencia): TipoElemento | null {
  if (advertencia.elementoId === null) {
    return null;
  }
  if (CODIGOS_DE_POOL.has(advertencia.codigo)) {
    return 'pool';
  }
  return CODIGOS_DE_ARCO.has(advertencia.codigo) ? 'arco' : 'nodo';
}

/** Peor severidad por id para un tipo de elemento: el ERROR gana sobre el AVISO. */
export function severidadesPor(advertencias: Advertencia[], tipo: TipoElemento): Map<number, Severidad> {
  const mapa = new Map<number, Severidad>();
  for (const a of advertencias) {
    if (tipoDeElemento(a) === tipo && mapa.get(a.elementoId!) !== 'ERROR') {
      mapa.set(a.elementoId!, a.severidad);
    }
  }
  return mapa;
}
