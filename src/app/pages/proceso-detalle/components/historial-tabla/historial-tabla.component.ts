import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap } from 'rxjs';

import { PaginadorComponent } from '../../../../components/paginador/paginador.component';
import { problemaDe } from '../../../../core/services/errores';
import { TipoCambio } from '../../../../models/historial.model';
import { ProblemDetail } from '../../../../models/problem-detail.model';
import { ProcesoService } from '../../../../service/proceso.service';

/** HU-07: historial de cambios del proceso (quién, cuándo y qué), lo más reciente primero. */
@Component({
  selector: 'app-historial-tabla',
  imports: [DatePipe, PaginadorComponent],
  templateUrl: './historial-tabla.component.html',
})
export class HistorialTablaComponent {
  private readonly procesoService = inject(ProcesoService);

  procesoId = input.required<number>();
  /** El padre la incrementa cuando hace un cambio, para recargar. */
  recarga = input<number>(0);

  page = signal(0);
  problema = signal<ProblemDetail | null>(null);

  readonly etiquetas: Record<TipoCambio, string> = {
    CREACION: 'Creación',
    EDICION: 'Edición',
    CAMBIO_ESTADO: 'Cambio de estado',
    ELIMINACION: 'Eliminación',
    COMPARTICION: 'Compartición',
  };

  readonly colores: Record<TipoCambio, string> = {
    CREACION: 'text-bg-success',
    EDICION: 'text-bg-primary',
    CAMBIO_ESTADO: 'text-bg-info',
    ELIMINACION: 'text-bg-danger',
    COMPARTICION: 'text-bg-secondary',
  };

  private readonly consulta = computed(() => ({ id: this.procesoId(), page: this.page(), recarga: this.recarga() }));

  resultado = toSignal(
    toObservable(this.consulta).pipe(
      switchMap((c) =>
        this.procesoService.historial(c.id, c.page).pipe(
          catchError((err) => {
            this.problema.set(problemaDe(err));
            return of(null);
          }),
        ),
      ),
    ),
    { initialValue: null },
  );
}
