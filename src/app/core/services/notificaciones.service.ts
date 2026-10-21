import { Injectable, signal } from '@angular/core';

export type TipoNotificacion = 'exito' | 'error' | 'info';

export interface Notificacion {
  id: number;
  tipo: TipoNotificacion;
  mensaje: string;
}

/**
 * Avisos breves (toasts) que cualquier página puede publicar, aunque navegue justo después:
 * el estado vive en este servicio compartido y los muestra un solo componente en la raíz.
 */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  static readonly DURACION_MS = 5000;

  private siguienteId = 1;
  private readonly _avisos = signal<Notificacion[]>([]);
  readonly avisos = this._avisos.asReadonly();

  exito(mensaje: string): void {
    this.mostrar('exito', mensaje);
  }

  error(mensaje: string): void {
    this.mostrar('error', mensaje);
  }

  info(mensaje: string): void {
    this.mostrar('info', mensaje);
  }

  cerrar(id: number): void {
    this._avisos.update((lista) => lista.filter((n) => n.id !== id));
  }

  private mostrar(tipo: TipoNotificacion, mensaje: string): void {
    const id = this.siguienteId++;
    this._avisos.update((lista) => [...lista, { id, tipo, mensaje }]);
    setTimeout(() => this.cerrar(id), NotificacionesService.DURACION_MS);
  }
}
