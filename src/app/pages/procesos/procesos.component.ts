import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, finalize, of, switchMap } from 'rxjs';

import { AlertaErrorComponent } from '../../components/alerta-error/alerta-error.component';
import { ConfirmarModalComponent } from '../../components/confirmar-modal/confirmar-modal.component';
import { EstadoBadgeComponent } from '../../components/estado-badge/estado-badge.component';
import { PageTitleComponent } from '../../components/page-title/page-title.component';
import { PaginadorComponent } from '../../components/paginador/paginador.component';
import { Columna, TablaGenericaComponent } from '../../components/tabla-generica/tabla-generica.component';
import { problemaDe } from '../../core/services/errores';
import { SesionStore } from '../../core/services/sesion.store';
import { ProblemDetail } from '../../models/problem-detail.model';
import { EstadoProceso, Proceso } from '../../models/proceso.model';
import { ProcesoService } from '../../service/proceso.service';

/**
 * HU-07: procesos de la empresa con búsqueda por nombre, filtros por estado y categoría, orden y
 * paginación. "Ver eliminados" lista los inactivos (HU-06), que se conservan para consulta.
 */
@Component({
  selector: 'app-procesos',
  imports: [
    DatePipe, RouterLink, PageTitleComponent, PaginadorComponent, AlertaErrorComponent, ConfirmarModalComponent,
    EstadoBadgeComponent, TablaGenericaComponent,
  ],
  templateUrl: './procesos.component.html',
})
export class ProcesosComponent {
  private readonly procesoService = inject(ProcesoService);
  readonly sesion = inject(SesionStore);

  /** Aviso que deja otra pantalla al volver (por ejemplo, después de eliminar). */
  eliminado = input<string>();

  texto = signal('');
  estado = signal<EstadoProceso | ''>('');
  categoria = signal('');
  verEliminados = signal(false);
  page = signal(0);
  orden = signal('nombre,asc');
  private readonly recargar = signal(0);

  cargando = signal(true);
  problema = signal<ProblemDetail | null>(null);
  aviso = signal('');
  porEliminar = signal<Proceso | null>(null);

  categorias = toSignal(this.procesoService.categorias().pipe(catchError(() => of([] as string[]))), {
    initialValue: [] as string[],
  });

  columnas: Columna[] = [
    { clave: 'nombre', titulo: 'Nombre', ordenable: true },
    { clave: 'categoria', titulo: 'Categoría', ordenable: true },
    { clave: 'estado', titulo: 'Estado', ordenable: true },
    { clave: 'modificadoEn', titulo: 'Última modificación', ordenable: true },
    { clave: '', titulo: 'Acciones', clase: 'text-end' },
  ];

  private readonly consulta = computed(() => ({
    filtro: { nombre: this.texto(), estado: this.estado(), categoria: this.categoria(), activo: !this.verEliminados() },
    paginacion: { page: this.page(), size: 10, sort: this.orden() },
    recarga: this.recargar(),
  }));

  resultado = toSignal(
    toObservable(this.consulta).pipe(
      debounceTime(300),
      switchMap((c) => {
        this.cargando.set(true);
        return this.procesoService.listar(c.filtro, c.paginacion).pipe(
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

  hayFiltros = computed(() => this.texto() !== '' || this.estado() !== '' || this.categoria() !== '');

  // Cualquier cambio de filtro u orden vuelve a la primera página
  buscar(texto: string): void {
    this.texto.set(texto);
    this.page.set(0);
  }

  filtrarEstado(estado: EstadoProceso | ''): void {
    this.estado.set(estado);
    this.page.set(0);
  }

  filtrarCategoria(categoria: string): void {
    this.categoria.set(categoria);
    this.page.set(0);
  }

  mostrarEliminados(ver: boolean): void {
    this.verEliminados.set(ver);
    this.page.set(0);
  }

  ordenar(orden: string): void {
    this.orden.set(orden);
    this.page.set(0);
  }

  limpiarFiltros(): void {
    this.texto.set('');
    this.estado.set('');
    this.categoria.set('');
    this.page.set(0);
  }

  confirmarEliminar(): void {
    const proceso = this.porEliminar();
    this.porEliminar.set(null);
    if (!proceso) {
      return;
    }
    this.problema.set(null);
    this.procesoService.eliminar(proceso.id).subscribe({
      next: () => {
        this.aviso.set(`"${proceso.nombre}" quedó eliminado. Puede consultarlo en "Ver eliminados".`);
        this.recargar.update((n) => n + 1);
      },
      error: (err) => this.problema.set(problemaDe(err)),
    });
  }
}
