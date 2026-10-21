import { Arco } from '../../models/arco.model';
import { Mensaje } from '../../models/mensaje.model';
import { Nodo, TipoActividad, TipoNodo } from '../../models/nodo.model';
import { Pool } from '../../models/pool.model';

/*
 * El proceso de solicitud de vacaciones del enunciado del proyecto, con las mismas posiciones que
 * los datos demo del backend. Es solo para mostrar el lienzo en la página pública: no viene de la API.
 */
const EMPRESA = 1;
const CORREO = 2;
const EMPLEADO = 11;
const JEFE = 12;
const TALENTO_HUMANO = 13;

export const POOLS_EJEMPLO: Pool[] = [
  {
    id: EMPRESA, procesoId: 1, nombre: 'Empresa', tipo: 'PROPIETARIO', cajaNegra: false, orden: 0,
    permisoEstructura: 'ADMINISTRADOR_Y_EDITOR',
    lanes: [
      { id: EMPLEADO, poolId: EMPRESA, rolProcesoId: 1, nombre: 'Empleado', orden: 0 },
      { id: JEFE, poolId: EMPRESA, rolProcesoId: 2, nombre: 'Jefe inmediato', orden: 1 },
      { id: TALENTO_HUMANO, poolId: EMPRESA, rolProcesoId: 3, nombre: 'Talento Humano', orden: 2 },
    ],
  },
  {
    id: CORREO, procesoId: 1, nombre: 'Servicio de correo', tipo: 'SISTEMA_EXTERNO', cajaNegra: true, orden: 1,
    permisoEstructura: 'ADMINISTRADOR_Y_EDITOR', lanes: [],
  },
];

function nodo(id: number, tipo: TipoNodo, nombre: string, laneId: number, posX: number,
              extra: Partial<Nodo> = {}): Nodo {
  return {
    id, poolId: EMPRESA, laneId, tipo, nombre, tipoActividad: null, tipoGateway: null, variante: null,
    posX, posY: 0, ...extra,
  };
}

const actividad = (id: number, nombre: string, laneId: number, posX: number, tipoActividad: TipoActividad) =>
  nodo(id, 'ACTIVIDAD', nombre, laneId, posX, { tipoActividad });

export const NODOS_EJEMPLO: Nodo[] = [
  nodo(101, 'EVENTO_INICIO', 'Solicitud', EMPLEADO, 40, { variante: 'INICIO' }),
  actividad(102, 'Radicar solicitud', EMPLEADO, 160, 'USUARIO'),
  actividad(103, 'Revisar solicitud', JEFE, 320, 'USUARIO'),
  nodo(104, 'GATEWAY', '¿Aprobada?', JEFE, 480, { tipoGateway: 'EXCLUSIVO' }),
  actividad(105, 'Registrar rechazo', JEFE, 640, 'MANUAL'),
  actividad(106, 'Actualizar días', TALENTO_HUMANO, 640, 'SERVICIO'),
  nodo(107, 'MESSAGE_THROW', 'NotificarAprobacion', TALENTO_HUMANO, 800, { variante: 'INTERMEDIO' }),
  nodo(108, 'EVENTO_FIN', 'Vacaciones aprobadas', TALENTO_HUMANO, 960, { variante: 'FIN' }),
  nodo(109, 'EVENTO_FIN', 'Solicitud rechazada', JEFE, 800, { variante: 'FIN' }),
];

const arco = (id: number, origenId: number, destinoId: number, etiqueta: string | null = null): Arco =>
  ({ id, origenId, destinoId, etiqueta, condicion: null });

export const ARCOS_EJEMPLO: Arco[] = [
  arco(1, 101, 102), arco(2, 102, 103), arco(3, 103, 104), arco(4, 104, 106, 'Sí'), arco(5, 104, 105, 'No'),
  arco(6, 106, 107), arco(7, 107, 108), arco(8, 105, 109),
];

export const MENSAJES_EJEMPLO: Mensaje[] = [
  {
    id: 201, nodo: NODOS_EJEMPLO[6], direccion: 'ENVIO', nombre: 'NotificarAprobacion',
    poolOrigenId: EMPRESA, poolDestinoId: CORREO, nodoDestinoId: null, tipoDestino: 'CORREO',
    momento: 'Después de actualizar los días de vacaciones', politicaFallo: 'CONTINUAR', actividadManejoErrorId: null,
    origenExterno: false, claveCorrelacion: 'numeroSolicitud', accionSinCaso: 'DESCARTAR',
    campos: [{ nombre: 'numeroSolicitud', tipoDato: 'TEXTO' }, { nombre: 'diasAprobados', tipoDato: 'NUMERO' }],
    actividadesQueUsanIds: [],
  },
];
