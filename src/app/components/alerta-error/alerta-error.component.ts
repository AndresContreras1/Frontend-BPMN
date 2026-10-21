import { Component, computed, input, output } from '@angular/core';

import { ProblemDetail } from '../../models/problem-detail.model';

/** Muestra un error de la API (ProblemDetail) con sus detalles, sin información técnica. */
@Component({
  selector: 'app-alerta-error',
  templateUrl: './alerta-error.component.html',
})
export class AlertaErrorComponent {
  /** Error que devolvió la API; si es null no se muestra la alerta. */
  problema = input<ProblemDetail | null>(null);
  /** Se emite cuando el usuario pulsa la X, para que el padre borre el error. */
  cerrar = output<void>();

  /** Convierte el objeto errors ({ campo: mensaje }) en una lista para poder recorrerla con @for. */
  erroresPorCampo = computed(() =>
    // Object.entries da pares [campo, mensaje]; los pasamos a objetos con nombre
    Object.entries(this.problema()?.errors ?? {}).map(([campo, mensaje]) => ({ campo, mensaje })),
  );
}
