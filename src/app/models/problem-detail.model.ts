/** Error de la API en formato ProblemDetail (RFC 9457). */
export interface ProblemDetail {
  type?: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  /** Código interno estable del error (RECURSO_NO_ENCONTRADO, REGLA_DE_NEGOCIO, SIN_PERMISOS...). */
  codigo?: string;
  /** Momento del error en el servidor (ISO-8601). */
  timestamp?: string;
  /** Errores de validación por campo (400). */
  errors?: Record<string, string>;
  /** Detalles de una regla de negocio (409), por ejemplo los procesos que usan un rol. */
  detalles?: string[];
}
