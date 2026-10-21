/** HU-11: flujo de secuencia (línea continua) entre dos elementos del mismo pool. */
export interface Arco {
  id: number;
  origenId: number;
  destinoId: number;
  etiqueta: string | null;
  condicion: string | null;
}
