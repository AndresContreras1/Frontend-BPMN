import { Paginacion } from '../../models/page-response.model';

/** Tipos de valor que puede tener un filtro; null, undefined y el texto vacío se consideran sin filtro. */
type Valor = string | number | boolean | null | undefined;

/**
 * Arma los query params de una consulta paginada (page, size, sort) más sus filtros.
 * Los filtros vacíos no se envían, así la API aplica sus valores por defecto.
 */
export function parametros(paginacion: Paginacion, filtros: Record<string, Valor> = {}): Record<string, string | number | boolean> {
  // Siempre van la página y el tamaño
  const resultado: Record<string, string | number | boolean> = {
    page: paginacion.page,
    size: paginacion.size,
  };
  // El orden es opcional
  if (paginacion.sort) {
    resultado['sort'] = paginacion.sort;
  }
  // Se agregan solo los filtros que tienen valor; a los textos se les quitan los espacios sobrantes
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== null && valor !== undefined && valor !== '') {
      resultado[clave] = typeof valor === 'string' ? valor.trim() : valor;
    }
  }
  return resultado;
}
