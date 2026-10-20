/** HU-04: el proceso nace en BORRADOR y puede pasar a PUBLICADO. */
export type EstadoProceso = 'BORRADOR' | 'PUBLICADO';

export interface Proceso {
  id: number;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  estado: EstadoProceso;
  activo: boolean;
  version: number;
  /** Falso cuando otra empresa lo compartió conmigo (HU-23): solo lectura. */
  propio: boolean;
  creadoEn: string;
  creadoPor: string;
  modificadoEn: string;
  modificadoPor: string;
}

export interface ProcesoRequest {
  nombre: string;
  descripcion: string | null;
  categoria: string;
}

export interface ProcesoActualizacionRequest extends ProcesoRequest {
  estado: EstadoProceso;
  version?: number;
}

/** HU-07: filtros de la lista. */
export interface FiltroProceso {
  nombre: string;
  estado: EstadoProceso | '';
  categoria: string;
  activo: boolean;
}

/** HU-23 */
export interface Comparticion {
  compartido: boolean;
  empresas: { nombre: string; nit: string }[];
}

export interface ProcesoCompartido {
  proceso: Proceso;
  empresaPropietaria: string;
}

/** HU-07: indicadores de la página de inicio (GET /procesos/resumen). */
export interface ResumenProcesos {
  total: number;
  borradores: number;
  publicados: number;
  eliminados: number;
  compartidosConmigo: number;
}

export interface ProcesoResumen {
  id: number;
  nombre: string;
}
