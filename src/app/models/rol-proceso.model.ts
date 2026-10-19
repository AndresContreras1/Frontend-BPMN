import { ProcesoResumen } from './proceso.model';

/** Rol de proceso (HU-17): la función responsable; se dibuja como lane. */
export interface RolProceso {
  id: number;
  nombre: string;
  descripcion: string | null;
  enUso: boolean;
  eliminable: boolean;
  procesos: ProcesoResumen[];
}

export interface RolProcesoRequest {
  nombre: string;
  descripcion: string | null;
}

export interface RolProcesoResumen {
  id: number;
  nombre: string;
}
