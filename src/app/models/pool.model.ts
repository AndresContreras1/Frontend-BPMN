import { Lane } from './lane.model';

/** HU-21: la empresa dueña del proceso o un participante externo. */
export type TipoPool = 'PROPIETARIO' | 'CLIENTE' | 'PROVEEDOR' | 'SISTEMA_EXTERNO';

/** HU-24: quién puede cambiar pools y lanes del proceso. */
export type PermisoEstructura = 'SOLO_ADMINISTRADOR' | 'ADMINISTRADOR_Y_EDITOR';

export const TIPOS_POOL_EXTERNO: TipoPool[] = ['CLIENTE', 'PROVEEDOR', 'SISTEMA_EXTERNO'];

/** Participante del proceso; la caja negra no tiene lanes ni elementos internos. */
export interface Pool {
  id: number;
  procesoId: number;
  nombre: string;
  tipo: TipoPool;
  cajaNegra: boolean;
  orden: number;
  permisoEstructura: PermisoEstructura;
  lanes: Lane[];
}

export interface PoolRequest {
  nombre: string;
  tipo: TipoPool;
  cajaNegra: boolean;
}
