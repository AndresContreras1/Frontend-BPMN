import { Advertencia, Severidad } from '../../models/diagrama.model';

/** A qué apunta elementoId según el código del validador del backend. */
export type TipoElemento = 'pool' | 'arco' | 'nodo';

// Códigos del validador cuyo elementoId es un pool (el problema afecta a todo el pool)
const CODIGOS_DE_POOL = new Set(['SIN_INICIO', 'SIN_FIN', 'CAJA_NEGRA_CON_ELEMENTOS']);
// Códigos cuyo elementoId es un arco (flujo de secuencia)
const CODIGOS_DE_ARCO = new Set(['CONDICION_FALTANTE']);

/**
 * Dice a qué tipo de elemento apunta una advertencia, según su código.
 * Devuelve null si la advertencia no está ligada a ningún elemento.
 */
export function tipoDeElemento(advertencia: Advertencia): TipoElemento | null {
  // Advertencia general del proceso: no se dibuja sobre ningún elemento
  if (advertencia.elementoId === null) {
    return null;
  }
  // Códigos propios de pools
  if (CODIGOS_DE_POOL.has(advertencia.codigo)) {
    return 'pool';
  }
  // Si no es de pool ni de arco, por descarte es de un nodo (actividad, gateway o evento)
  return CODIGOS_DE_ARCO.has(advertencia.codigo) ? 'arco' : 'nodo';
}

/** Peor severidad por id para un tipo de elemento: el ERROR gana sobre el AVISO. */
export function severidadesPor(advertencias: Advertencia[], tipo: TipoElemento): Map<number, Severidad> {
  // Mapa id del elemento -> severidad más grave
  const mapa = new Map<number, Severidad>();
  // Recorremos todas las advertencias y nos quedamos con las del tipo pedido
  for (const a of advertencias) {
    // Solo se reemplaza la severidad si la que ya estaba no es ERROR (el ERROR nunca se baja a AVISO)
    if (tipoDeElemento(a) === tipo && mapa.get(a.elementoId!) !== 'ERROR') {
      mapa.set(a.elementoId!, a.severidad);
    }
  }
  return mapa;
}
