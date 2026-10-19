import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, finalize, of, switchMap } from 'rxjs';

import { AlertaErrorComponent } from '../../components/alerta-error/alerta-error.component';
import { EstadoBadgeComponent } from '../../components/estado-badge/estado-badge.component';
import { PageTitleComponent } from '../../components/page-title/page-title.component';
import { PaginadorComponent } from '../../components/paginador/paginador.component';
import { Columna, TablaGenericaComponent } from '../../components/tabla-generica/tabla-generica.component';
import { problemaDe } from '../../core/services/errores';
import { ProblemDetail } from '../../models/problem-detail.model';
import { ProcesoService } from '../../service/proceso.service';

/** HU-23: procesos que otras empresas compartieron con la mía, en solo lectura. */
@Component({
  selector: 'app-compartidos',
  imports: [DatePipe, RouterLink, PageTitleComponent, PaginadorComponent, AlertaErrorComponent, EstadoBadgeComponent, TablaGenericaComponent],
  templateUrl: './compartidos.component.html',
})
export class CompartidosComponent {
  private readonly procesoService = inject(ProcesoService);

  page = signal(0);
  orden = signal('nombre,asc');
  cargando = signal(true);
  problema = signal<ProblemDetail | null>(null);

  columnas: Columna[] = [
    { clave: 'nombre', titulo: 'Nombre', ordenable: true },
    { clave: '', titulo: 'Empresa propietaria' },
    { clave: 'categoria', titulo: 'Categoría', ordenable: true },
    { clave: 'estado', titulo: 'Estado', ordenable: true },
    { clave: 'modificadoEn', titulo: 'Última modificación', ordenable: true },
  ];

  private readonly consulta = computed(() => ({ page: this.page(), size: 10, sort: this.orden() }));

  resultado = toSignal(
    toObservable(this.consulta).pipe(
      switchMap((paginacion) => {
        this.cargando.set(true);
        return this.procesoService.compartidosConmigo(paginacion).pipe(
          catchError((err) => {
            this.problema.set(problemaDe(err));
            return of(null);
          }),
          finalize(() => this.cargando.set(false)),
        );
      }),
    ),
    { initialValue: null },
  );

  ordenar(orden: string): void {
    this.orden.set(orden);
    this.page.set(0);
  }
}
