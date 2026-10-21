import { Injectable, signal } from '@angular/core';

/** Tipos de aviso posibles; cada uno se muestra con un estilo distinto. */
export type TipoNotificacion = 'exito' | 'error' | 'info';

/** Un aviso (toast) que se muestra en pantalla. */
export interface Notificacion {
  /** Identificador único, sirve para cerrar este aviso en particular. */
  id: number;
  /** Tipo de aviso (éxito, error o información). */
  tipo: TipoNotificacion;
  /** Texto que ve el usuario. */
  mensaje: string;
}

/**
 * Avisos breves (toasts) que cualquier página puede publicar, aunque navegue justo después:
 * el estado vive en este servicio compartido y los muestra un solo componente en la raíz.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  /** Cuánto dura un aviso en pantalla antes de cerrarse solo (5 segundos). */
  static readonly DURACION_MS = 5000;

  /** Contador para darle un id distinto a cada aviso. */
  private siguienteId = 1;
  /** Lista de avisos visibles; solo este servicio la modifica. */
  private readonly _avisos = signal<Notificacion[]>([]);
  /** Versión de solo lectura de la lista para que los componentes la lean. */
  readonly avisos = this._avisos.asReadonly();

  /** Muestra un aviso de éxito. */
  exito(mensaje: string): void {
    this.mostrar('exito', mensaje);
  }

  /** Muestra un aviso de error. */
  error(mensaje: string): void {
    this.mostrar('error', mensaje);
  }

  /** Muestra un aviso informativo. */
  info(mensaje: string): void {
    this.mostrar('info', mensaje);
  }

  /** Quita de la lista el aviso con ese id. */
  cerrar(id: number): void {
    this._avisos.update((lista) => lista.filter((n) => n.id !== id));
  }

  /** Agrega un aviso a la lista y programa su cierre automático. */
  private mostrar(tipo: TipoNotificacion, mensaje: string): void {
    // Se toma el id actual y se incrementa el contador
    const id = this.siguienteId++;
    // Se crea una lista nueva (sin mutar) para que el signal detecte el cambio
    this._avisos.update((lista) => [...lista, { id, tipo, mensaje }]);
    // Pasado el tiempo, el aviso se cierra solo
    setTimeout(() => this.cerrar(id), NotificacionesService.DURACION_MS);
  }
}
