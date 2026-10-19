/** Página de resultados de la API. */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Parámetros de paginación que se envían a la API. */
export interface Paginacion {
  page: number;
  size: number;
  sort?: string;
}
