import { computed, Injectable, signal } from '@angular/core';

/** Cuántas peticiones HTTP siguen en curso: la barra de carga global se ve mientras quede alguna. */
@Injectable({ providedIn: 'root' })
export class CargaService {
  /** Contador de peticiones en curso. */
  private readonly pendientes = signal(0);
  /** Es true mientras haya al menos una petición pendiente; la barra de carga se basa en esto. */
  readonly cargando = computed(() => this.pendientes() > 0);

  /** Se llama cuando empieza una petición: suma una al contador. */
  iniciar(): void {
    this.pendientes.update((n) => n + 1);
  }

  /** Se llama cuando termina una petición: resta una, sin bajar de cero. */
  terminar(): void {
    this.pendientes.update((n) => Math.max(0, n - 1));
  }
}
