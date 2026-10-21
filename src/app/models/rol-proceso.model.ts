import { ProcesoResumen } from './proceso.model';

/** Rol de proceso (HU-17): la función responsable; se dibuja como lane. */
export interface RolProceso {
  /** Identificador del rol. */
  id: number;
  /** Nombre del rol. */
  nombre: string;
  /** Descripción opcional. */
  descripcion: string | null;
  /** True si algún proceso lo usa. */
  enUso: boolean;
  /** True si se puede borrar (no está en uso). */
  eliminable: boolean;
  /** Procesos que usan este rol. */
  procesos: ProcesoResumen[];
}

/** Datos para crear o editar un rol de proceso. */
export interface RolProcesoRequest {
  /** Nombre del rol. */
  nombre: string;
  /** Descripción opcional. */
  descripcion: string | null;
}

/** Versión corta de un rol (solo id y nombre). */
export interface RolProcesoResumen {
  /** Identificador del rol. */
  id: number;
  /** Nombre del rol. */
  nombre: string;
}
