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
  private readonly rolProcesoService = inject(RolProcesoService);

  rol = input.required<RolProceso>();
  cerrar = output<void>();

  historial = toSignal(
    toObservable(this.rol).pipe(
      switchMap((rol) => this.rolProcesoService.historial(rol.id).pipe(catchError(() => of([] as HistorialCambio[])))),
    ),
    { initialValue: null },
  );
}
