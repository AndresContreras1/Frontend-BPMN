import { Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, finalize, of, switchMap } from 'rxjs';

import { DiagramaSvgComponent } from '../../../../components/diagrama/diagrama-svg/diagrama-svg.component';
import { problemaDe } from '../../../../core/services/errores';
import { Diagrama } from '../../../../models/diagrama.model';
import { ProblemDetail } from '../../../../models/problem-detail.model';
import { DiagramaService } from '../../../../service/diagrama.service';

/**
 * HU-07: al abrir un proceso se ve su diagrama completo (pools, lanes, eventos, actividades, gateways,
 * arcos y mensajes), en solo lectura. Para modificarlo se abre el editor.
 */
@Component({
  selector: 'app-diagrama-vista',
  imports: [DiagramaSvgComponent],
  templateUrl: './diagrama-vista.component.html',
})
export class DiagramaVistaComponent {
  private readonly diagramaService = inject(DiagramaService);

  procesoId = input.required<number>();

  cargando = signal(true);
  problema = signal<ProblemDetail | null>(null);

  /** switchMap: si cambia el proceso antes de que llegue la respuesta, se descarta la anterior. */
  diagrama = toSignal(
    toObservable(this.procesoId).pipe(
      switchMap((id) => {
        this.cargando.set(true);
        this.problema.set(null);
        return this.diagramaService.obtener(id).pipe(
          catchError((err) => {
            this.problema.set(problemaDe(err));
            return of(null);
          }),
          finalize(() => this.cargando.set(false)),
        );
      }),
    ),
    { initialValue: null as Diagrama | null },
  );

  /** Resumen de lo que contiene el diagrama, para leerlo sin recorrer el lienzo. */
  resumen = computed(() => {
    const d = this.diagrama();
    if (!d) {
      return null;
    }
    return {
      pools: d.pools.length,
      lanes: d.pools.reduce((total, pool) => total + pool.lanes.length, 0),
      elementos: d.nodos.length,
      arcos: d.arcos.length,
      mensajes: d.mensajes.length,
      errores: d.advertencias.filter((a) => a.severidad === 'ERROR').length,
    };
  });
}
