import { Lane } from './lane.model';

/** HU-21: la empresa dueña del proceso o un participante externo. */
export type TipoPool = 'PROPIETARIO' | 'CLIENTE' | 'PROVEEDOR' | 'SISTEMA_EXTERNO';

/** HU-24: quién puede cambiar pools y lanes del proceso. */
export type PermisoEstructura = 'SOLO_ADMINISTRADOR' | 'ADMINISTRADOR_Y_EDITOR';

/** Tipos de pool que representan a un participante externo (todos menos el propietario). */
export const TIPOS_POOL_EXTERNO: TipoPool[] = ['CLIENTE', 'PROVEEDOR', 'SISTEMA_EXTERNO'];

/** Participante del proceso; la caja negra no tiene lanes ni elementos internos. */
export interface Pool {
  /** Identificador del pool. */
  id: number;
  /** Proceso al que pertenece. */
  procesoId: number;
  /** Nombre del participante. */
  nombre: string;
  /** Tipo de participante. */
  tipo: TipoPool;
  /** True si es una caja negra (no se detalla su interior). */
  cajaNegra: boolean;
  /** Posición del pool en el diagrama. */
  orden: number;
  /** Quién puede modificar la estructura de este pool. */
  permisoEstructura: PermisoEstructura;
  /** Lanes que contiene. */
  lanes: Lane[];
}

/** Datos para crear un pool. */
export interface PoolRequest {
  /** Nombre del participante. */
  nombre: string;
  /** Tipo de participante. */
  tipo: TipoPool;
  /** Si es caja negra. */
  cajaNegra: boolean;
}
