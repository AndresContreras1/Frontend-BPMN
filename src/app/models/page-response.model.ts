/** Página de resultados de la API. */
export interface PageResponse<T> {
  /** Elementos de la página actual. */
  content: T[];
  /** Número de la página actual (empieza en 0). */
  page: number;
  /** Cantidad de elementos por página. */
  size: number;
  /** Total de elementos en todas las páginas. */
  totalElements: number;
  /** Total de páginas. */
  totalPages: number;
}

/** Parámetros de paginación que se envían a la API. */
export interface Paginacion {
  /** Página que se pide (empieza en 0). */
  page: number;
  /** Cuántos elementos por página. */
  size: number;
  /** Orden opcional, con el formato campo,direccion. */
  sort?: string;
}
