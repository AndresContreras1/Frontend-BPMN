import { Component, computed, input, output } from '@angular/core';

import { ProblemDetail } from '../../models/problem-detail.model';

/** Muestra un error de la API (ProblemDetail) con sus detalles, sin información técnica. */
@Component({
  selector: 'app-alerta-error',
  templateUrl: './alerta-error.component.html',
})
export class AlertaErrorComponent {
  problema = input<ProblemDetail | null>(null);
  cerrar = output<void>();

  erroresPorCampo = computed(() =>
    Object.entries(this.problema()?.errors ?? {}).map(([campo, mensaje]) => ({ campo, mensaje })),
  );
}
