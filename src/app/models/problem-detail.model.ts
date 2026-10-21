/** Error de la API en formato ProblemDetail (RFC 9457). */
export interface ProblemDetail {
  type?: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  /** Errores de validación por campo (400). */
  errors?: Record<string, string>;
  /** Detalles de una regla de negocio (409), por ejemplo los procesos que usan un rol. */
  detalles?: string[];
}
