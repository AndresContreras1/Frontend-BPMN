/** HU-04: el proceso nace en BORRADOR y puede pasar a PUBLICADO. */
export type EstadoProceso = 'BORRADOR' | 'PUBLICADO';

/** Un proceso de negocio con sus datos generales y de auditoría. */
export interface Proceso {
  /** Identificador del proceso. */
  id: number;
  /** Nombre del proceso. */
  nombre: string;
  /** Descripción opcional. */
  descripcion: string | null;
  /** Categoría para agruparlo. */
  categoria: string;
  /** Si está en borrador o publicado. */
  estado: EstadoProceso;
  /** False cuando fue eliminado (borrado lógico). */
  activo: boolean;
  /** Número de versión, sirve para detectar ediciones simultáneas. */
  version: number;
  /** Falso cuando otra empresa lo compartió conmigo (HU-23): solo lectura. */
  propio: boolean;
  /** Fecha de creación. */
  creadoEn: string;
  /** Quién lo creó. */
  creadoPor: string;
  /** Fecha de la última modificación. */
  modificadoEn: string;
  /** Quién lo modificó por última vez. */
  modificadoPor: string;
}

/** Datos para crear un proceso. */
export interface ProcesoRequest {
  /** Nombre del proceso. */
  nombre: string;
  /** Descripción opcional. */
  descripcion: string | null;
  /** Categoría. */
  categoria: string;
}

/** Datos para editar un proceso: los de la creación más el estado y la versión que se está editando. */
export interface ProcesoActualizacionRequest extends ProcesoRequest {
  /** Nuevo estado del proceso. */
  estado: EstadoProceso;
  /** Versión que el usuario tenía cargada, para que el servidor detecte conflictos. */
  version?: number;
}

/** HU-07: filtros de la lista. */
export interface FiltroProceso {
  /** Texto a buscar en el nombre. */
  nombre: string;
  /** Estado a filtrar; vacío significa todos. */
  estado: EstadoProceso | '';
  /** Categoría a filtrar. */
  categoria: string;
  /** True para ver los activos; false para ver los eliminados. */
  activo: boolean;
}

/** HU-23: con quién está compartido un proceso. */
export interface Comparticion {
  /** True si está compartido con al menos una empresa. */
  compartido: boolean;
  /** Empresas con las que se compartió. */
  empresas: { nombre: string; nit: string }[];
}

/** Un proceso que otra empresa compartió conmigo. */
export interface ProcesoCompartido {
  /** El proceso compartido. */
  proceso: Proceso;
  /** Nombre de la empresa dueña. */
  empresaPropietaria: string;
}

/** HU-07: indicadores de la página de inicio (GET /procesos/resumen). */
export interface ResumenProcesos {
  /** Total de procesos. */
  total: number;
  /** Cuántos están en borrador. */
  borradores: number;
  /** Cuántos están publicados. */
  publicados: number;
  /** Cuántos fueron eliminados. */
  eliminados: number;
  /** Cuántos otras empresas compartieron conmigo. */
  compartidosConmigo: number;
}

/** Versión corta de un proceso (solo id y nombre). */
export interface ProcesoResumen {
  /** Identificador del proceso. */
  id: number;
  /** Nombre del proceso. */
  nombre: string;
}
