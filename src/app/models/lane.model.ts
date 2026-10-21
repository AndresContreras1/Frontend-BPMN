/** HU-22: una lane es un rol de proceso dentro de un pool; su nombre es el del rol. */
export interface Lane {
  /** Identificador de la lane. */
  id: number;
  /** Pool al que pertenece. */
  poolId: number;
  /** Rol de proceso que representa la lane. */
  rolProcesoId: number;
  /** Nombre (el mismo del rol). */
  nombre: string;
  /** Posición de la lane dentro del pool. */
  orden: number;
}

/** Datos para crear una lane: solo hace falta indicar qué rol representa. */
export interface LaneRequest {
  /** Id del rol de proceso. */
  rolProcesoId: number;
}
