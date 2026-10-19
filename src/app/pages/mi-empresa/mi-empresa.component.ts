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
  private readonly empresaService = inject(EmpresaService);
  readonly sesion = inject(SesionStore);

  problema = signal<ProblemDetail | null>(null);

  empresa = toSignal(
    this.empresaService.actual().pipe(
      catchError((err) => {
        this.problema.set(problemaDe(err));
        return of(null);
      }),
    ),
    { initialValue: null },
  );
}
