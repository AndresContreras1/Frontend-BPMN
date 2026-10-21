import { computed, Injectable, signal } from '@angular/core';

/** Cuántas peticiones HTTP siguen en curso: la barra de carga global se ve mientras quede alguna. */
@Injectable({ providedIn: 'root' })
export class CargaService {
  private readonly pendientes = signal(0);
  readonly cargando = computed(() => this.pendientes() > 0);

  iniciar(): void {
    this.pendientes.update((n) => n + 1);
  }

  terminar(): void {
    this.pendientes.update((n) => Math.max(0, n - 1));
  }
}
