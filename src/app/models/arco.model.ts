/** HU-11 a HU-13: flujo de secuencia (línea continua) entre dos elementos del mismo pool. */
export interface Arco {
  /** Identificador del arco en la base de datos. */
  id: number;
  /** Id del nodo desde donde sale el flujo. */
  origenId: number;
  /** Id del nodo al que llega el flujo. */
  destinoId: number;
  /** Texto opcional que se dibuja sobre la línea (por ejemplo, Si o No). */
  etiqueta: string | null;
  /** Condición que debe cumplirse para tomar este camino (útil al salir de un gateway). */
  condicion: string | null;
}

/** Datos que se envían a la API para crear o editar un arco. */
export interface ArcoRequest {
  /** Proceso al que pertenece el arco. */
  procesoId: number;
  /** Id del nodo de origen. */
  origenId: number;
  /** Id del nodo de destino. */
  destinoId: number;
  /** Etiqueta de la línea (puede ir vacía). */
  etiqueta: string | null;
  /** Condición del camino (puede ir vacía). */
  condicion: string | null;
}
