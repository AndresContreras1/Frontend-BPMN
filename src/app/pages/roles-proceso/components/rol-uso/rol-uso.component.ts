import { DatePipe } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';

import { HistorialCambio } from '../../../../models/historial.model';
import { RolProceso } from '../../../../models/rol-proceso.model';
import { RolProcesoService } from '../../../../service/rol-proceso.service';

/** HU-20: en qué procesos se usa el rol (por qué no se puede eliminar) y su historial. */
@Component({
  selector: 'app-rol-uso',
  imports: [DatePipe, RouterLink],
  templateUrl: './rol-uso.component.html',
})
export class RolUsoComponent {
  /** Servicio que pide el historial del rol a la API. */
  private readonly rolProcesoService = inject(RolProcesoService);

  /** Rol que se muestra (obligatorio); ya trae la lista de procesos donde se usa. */
  rol = input.required<RolProceso>();
  /** Avisa al padre que se pulso la X, para que cierre el panel. */
  cerrar = output<void>();

  /**
   * Historial de cambios del rol como signal (null mientras carga).
   * toObservable convierte el input en flujo; switchMap vuelve a pedir el historial cada vez que
   * cambia el rol y descarta la respuesta anterior. Si falla, se muestra una lista vacia.
   */
  historial = toSignal(
    toObservable(this.rol).pipe(
      switchMap((rol) => this.rolProcesoService.historial(rol.id).pipe(catchError(() => of([] as HistorialCambio[])))),
    ),
    { initialValue: null },
  );
}
