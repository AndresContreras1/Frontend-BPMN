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
  /** Servicio que pide el historial a la API. */
  private readonly procesoService = inject(ProcesoService);

  /** Id del proceso del que se muestra el historial (obligatorio, lo entrega el padre). */
  procesoId = input.required<number>();
  /** El padre la incrementa cuando hace un cambio, para recargar. */
  recarga = input<number>(0);

  /** Pagina actual (empieza en 0, como la API). */
  page = signal(0);
  /** Error al cargar el historial. */
  problema = signal<ProblemDetail | null>(null);

  /** Texto legible para cada tipo de cambio que devuelve la API. */
  readonly etiquetas: Record<TipoCambio, string> = {
    CREACION: 'Creación',
    EDICION: 'Edición',
    CAMBIO_ESTADO: 'Cambio de estado',
    ELIMINACION: 'Eliminación',
    COMPARTICION: 'Compartición',
  };

  /** Clase de Bootstrap (color del badge) para cada tipo de cambio. */
  readonly colores: Record<TipoCambio, string> = {
    CREACION: 'text-bg-success',
    EDICION: 'text-bg-primary',
    CAMBIO_ESTADO: 'text-bg-info',
    ELIMINACION: 'text-bg-danger',
    COMPARTICION: 'text-bg-secondary',
  };

  /**
   * Junta en un solo objeto todo lo que, si cambia, obliga a pedir el historial otra vez:
   * el proceso, la pagina y el contador de recarga.
   */
  private readonly consulta = computed(() => ({ id: this.procesoId(), page: this.page(), recarga: this.recarga() }));

  /** Pagina de historial como signal (null hasta que llega). */
  resultado = toSignal(
    // Cada vez que cambia "consulta" se emite un valor nuevo y se hace otra peticion
    toObservable(this.consulta).pipe(
      // switchMap cancela la peticion anterior si llega una consulta nueva
      switchMap((c) =>
        this.procesoService.historial(c.id, c.page).pipe(
          // Si falla se guarda el error y se emite null
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
