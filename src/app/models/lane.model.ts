/** HU-22: una lane es un rol de proceso dentro de un pool; su nombre es el del rol. */
export interface Lane {
  id: number;
  poolId: number;
  rolProcesoId: number;
  nombre: string;
  orden: number;
}

export interface LaneRequest {
  rolProcesoId: number;
}
