import { Paginacion } from '../../models/page-response.model';

type Valor = string | number | boolean | null | undefined;

/**
 * Arma los query params de una consulta paginada (page, size, sort) más sus filtros.
 * Los filtros vacíos no se envían, así la API aplica sus valores por defecto.
 */
export function parametros(paginacion: Paginacion, filtros: Record<string, Valor> = {}): Record<string, string | number | boolean> {
  const resultado: Record<string, string | number | boolean> = {
    page: paginacion.page,
    size: paginacion.size,
  };
  if (paginacion.sort) {
    resultado['sort'] = paginacion.sort;
  }
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== null && valor !== undefined && valor !== '') {
      resultado[clave] = typeof valor === 'string' ? valor.trim() : valor;
    }
  }
  return resultado;
}
