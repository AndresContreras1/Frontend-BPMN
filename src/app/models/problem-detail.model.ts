/** Error de la API en formato ProblemDetail (RFC 9457). */
export interface ProblemDetail {
  /** URI que identifica el tipo de problema (opcional). */
  type?: string;
  /** Resumen corto del error. */
  title: string;
  /** Código de estado HTTP. */
  status: number;
  /** Explicación del error para el usuario. */
  detail: string;
  /** URI de la petición que falló (opcional). */
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
