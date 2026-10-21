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
  /** Servicio que pide el diagrama a la API. */
  private readonly diagramaService = inject(DiagramaService);

  /** Id del proceso cuyo diagrama se dibuja (obligatorio, lo entrega el padre). */
  procesoId = input.required<number>();

  /** True mientras llega el diagrama. */
  cargando = signal(true);
  /** Error al pedir el diagrama, para mostrarlo en pantalla. */
  problema = signal<ProblemDetail | null>(null);

  /**
   * Diagrama cargado como signal. toObservable convierte el input en flujo y toSignal vuelve a
   * convertir el resultado en signal, asi el HTML lo lee como diagrama().
   * switchMap: si cambia el proceso antes de que llegue la respuesta, se descarta la anterior.
   */
  diagrama = toSignal(
    toObservable(this.procesoId).pipe(
      switchMap((id) => {
        // Se reinicia el estado antes de cada peticion
        this.cargando.set(true);
        this.problema.set(null);
        return this.diagramaService.obtener(id).pipe(
          // Si falla se guarda el error y se emite null
          catchError((err) => {
            this.problema.set(problemaDe(err));
            return of(null);
          }),
          // Apaga el spinner al terminar, con exito o con error
          finalize(() => this.cargando.set(false)),
        );
      }),
    ),
    // Valor inicial mientras no ha llegado nada
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
      // reduce suma los lanes de todos los pools
      lanes: d.pools.reduce((total, pool) => total + pool.lanes.length, 0),
      elementos: d.nodos.length,
      arcos: d.arcos.length,
      mensajes: d.mensajes.length,
      // De todas las advertencias de coherencia solo se cuentan las graves (ERROR)
      errores: d.advertencias.filter((a) => a.severidad === 'ERROR').length,
    };
  });
}
