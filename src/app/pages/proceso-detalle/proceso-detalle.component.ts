import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, map, of, switchMap } from 'rxjs';

import { AlertaErrorComponent } from '../../components/alerta-error/alerta-error.component';
import { ConfirmarModalComponent } from '../../components/confirmar-modal/confirmar-modal.component';
import { EstadoBadgeComponent } from '../../components/estado-badge/estado-badge.component';
import { PageTitleComponent } from '../../components/page-title/page-title.component';
import { problemaDe } from '../../core/services/errores';
import { SesionStore } from '../../core/services/sesion.store';
import { ProblemDetail } from '../../models/problem-detail.model';
import { EstadoProceso, Proceso } from '../../models/proceso.model';
import { ProcesoService } from '../../service/proceso.service';
import { CompartirPanelComponent } from './components/compartir-panel/compartir-panel.component';
import { HistorialTablaComponent } from './components/historial-tabla/historial-tabla.component';

/**
 * Ficha del proceso (HU-07) con sus acciones: editar (HU-05), publicar o volver a borrador (HU-04),
 * eliminar (HU-06), historial y compartir (HU-23). Un proceso compartido por otra empresa o eliminado
 * se muestra en solo lectura.
 */
@Component({
  selector: 'app-proceso-detalle',
  imports: [
    DatePipe, RouterLink, PageTitleComponent, AlertaErrorComponent, ConfirmarModalComponent, EstadoBadgeComponent,
    HistorialTablaComponent, CompartirPanelComponent,
  ],
  templateUrl: './proceso-detalle.component.html',
})
export class ProcesoDetalleComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly procesoService = inject(ProcesoService);
  readonly sesion = inject(SesionStore);

  proceso = signal<Proceso | null>(null);
  cargando = signal(true);
  /** Error al cargar (404: no existe o es de otra empresa). */
  problemaCarga = signal<ProblemDetail | null>(null);
  problema = signal<ProblemDetail | null>(null);
  aviso = signal('');
  cambiandoEstado = signal(false);
  confirmandoEliminar = signal(false);
  recargaHistorial = signal(0);

  /** Editor o administrador, proceso propio y activo. */
  editable = computed(() => {
    const p = this.proceso();
    return !!p && p.propio && p.activo && this.sesion.puedeEditar();
  });

  /** Solo el administrador elimina y comparte. */
  administrable = computed(() => {
    const p = this.proceso();
    return !!p && p.propio && p.activo && this.sesion.esAdministrador();
  });

  constructor() {
    // switchMap: si el id de la ruta cambia sin salir de la página, se cancela la petición anterior
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('id'))),
        switchMap((id) => {
          this.cargando.set(true);
          this.problemaCarga.set(null);
          return this.procesoService.obtener(id).pipe(
            catchError((err) => {
              this.problemaCarga.set(problemaDe(err));
              return of(null);
            }),
            finalize(() => this.cargando.set(false)),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((proceso) => this.proceso.set(proceso));
  }

  /** HU-04: publicar exige un diagrama coherente; la API responde 409 con los motivos si no lo es. */
  cambiarEstado(estado: EstadoProceso): void {
    const p = this.proceso();
    if (!p) {
      return;
    }
    this.cambiandoEstado.set(true);
    this.problema.set(null);
    this.aviso.set('');
    this.procesoService
      .actualizar(p.id, { nombre: p.nombre, descripcion: p.descripcion, categoria: p.categoria, estado, version: p.version })
      .pipe(finalize(() => this.cambiandoEstado.set(false)))
      .subscribe({
        next: (actualizado) => {
          this.proceso.set(actualizado);
          this.aviso.set(estado === 'PUBLICADO' ? 'El proceso quedó publicado.' : 'El proceso volvió a borrador.');
          this.recargaHistorial.update((n) => n + 1);
        },
        error: (err) => this.problema.set(problemaDe(err)),
      });
  }

  eliminar(): void {
    const p = this.proceso();
    this.confirmandoEliminar.set(false);
    if (!p) {
      return;
    }
    this.procesoService.eliminar(p.id).subscribe({
      next: () => this.router.navigate(['/procesos'], { queryParams: { eliminado: p.nombre } }),
      error: (err) => this.problema.set(problemaDe(err)),
    });
  }
}
