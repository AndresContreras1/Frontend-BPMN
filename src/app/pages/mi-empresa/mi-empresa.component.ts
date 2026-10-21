import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, of } from 'rxjs';

import { AlertaErrorComponent } from '../../components/alerta-error/alerta-error.component';
import { PageTitleComponent } from '../../components/page-title/page-title.component';
import { problemaDe } from '../../core/services/errores';
import { SesionStore } from '../../core/services/sesion.store';
import { ProblemDetail } from '../../models/problem-detail.model';
import { EmpresaService } from '../../service/empresa.service';

/** HU-01 y HU-03: datos de la empresa del usuario y de su sesión. */
@Component({
  selector: 'app-mi-empresa',
  imports: [DatePipe, PageTitleComponent, AlertaErrorComponent],
  templateUrl: './mi-empresa.component.html',
})
export class MiEmpresaComponent {
  // Trae los datos de la empresa de la API
  private readonly empresaService = inject(EmpresaService);
  /** Datos del usuario con sesión; el template muestra su nombre, correo y rol. */
  readonly sesion = inject(SesionStore);

  /** Error de la API si no se pudo cargar la empresa. */
  problema = signal<ProblemDetail | null>(null);

  /** Empresa del usuario. toSignal convierte la petición en un signal; vale null mientras carga o si falla. */
  empresa = toSignal(
    // Pide la empresa de la sesión actual
    this.empresaService.actual().pipe(
      // Si falla, se guarda el error para mostrarlo y se devuelve null para que el signal no se rompa
      catchError((err) => {
        this.problema.set(problemaDe(err));
        return of(null);
      }),
    ),
    // Valor inicial mientras llega la respuesta
    { initialValue: null },
  );
}
