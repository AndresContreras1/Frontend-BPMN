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
  /** Servicio que habla con la API de procesos. */
  private readonly procesoService = inject(ProcesoService);

  /** Pagina actual (empieza en 0). */
  page = signal(0);
  /** Orden en formato "campo,direccion" que entiende la API. */
  orden = signal('nombre,asc');
  /** True mientras llega la lista. */
  cargando = signal(true);
  /** Error de la API para mostrar en la alerta. */
  problema = signal<ProblemDetail | null>(null);

  /** Columnas de la tabla; la de empresa propietaria no se puede ordenar. */
  columnas: Columna[] = [
    { clave: 'nombre', titulo: 'Nombre', ordenable: true },
    { clave: '', titulo: 'Empresa propietaria' },
    { clave: 'categoria', titulo: 'Categoría', ordenable: true },
    { clave: 'estado', titulo: 'Estado', ordenable: true },
    { clave: 'modificadoEn', titulo: 'Última modificación', ordenable: true },
  ];

  /** Parametros de paginacion; al ser computed cambia sola cuando cambia la pagina o el orden. */
  private readonly consulta = computed(() => ({ page: this.page(), size: 10, sort: this.orden() }));

  /** Pagina de procesos compartidos como signal (null hasta que llega la primera respuesta). */
  resultado = toSignal(
    toObservable(this.consulta).pipe(
      // switchMap: si llega una consulta nueva, cancela la anterior que siga en vuelo
      switchMap((paginacion) => {
        this.cargando.set(true);
        return this.procesoService.compartidosConmigo(paginacion).pipe(
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
    { initialValue: null },
  );

  /** Cambia el orden (lo emite la tabla) y vuelve a la primera pagina. */
  ordenar(orden: string): void {
    this.orden.set(orden);
    this.page.set(0);
  }
}
