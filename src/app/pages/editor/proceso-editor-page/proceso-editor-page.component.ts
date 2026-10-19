import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, map, Observable, switchMap } from 'rxjs';

import { AlertaErrorComponent } from '../../../components/alerta-error/alerta-error.component';
import { ConfirmarModalComponent } from '../../../components/confirmar-modal/confirmar-modal.component';
import { EstadoBadgeComponent } from '../../../components/estado-badge/estado-badge.component';
import { PageTitleComponent } from '../../../components/page-title/page-title.component';
import { problemaDe } from '../../../core/services/errores';
import { SesionStore } from '../../../core/services/sesion.store';
import { Lane } from '../../../models/lane.model';
import { PermisoEstructura, Pool, PoolRequest } from '../../../models/pool.model';
import { ProblemDetail } from '../../../models/problem-detail.model';
import { LaneService } from '../../../service/lane.service';
import { PoolService } from '../../../service/pool.service';
import { EstructuraPanelComponent, MovimientoLane } from '../components/estructura-panel/estructura-panel.component';
import { LaneFormComponent } from '../components/lane-form/lane-form.component';
import { PoolFormComponent } from '../components/pool-form/pool-form.component';
import { EditorStore } from '../editor.store';

interface Confirmacion {
  titulo: string;
  mensaje: string;
  accion: () => Observable<unknown>;
  exito: string;
}

/**
 * Editor del diagrama del proceso. Coordina: carga el diagrama en el EditorStore, recibe los eventos
 * de los paneles hijos, llama a la API y recarga el diagrama para que las advertencias queden al día.
 */
@Component({
  selector: 'app-proceso-editor-page',
  imports: [
    RouterLink, PageTitleComponent, AlertaErrorComponent, ConfirmarModalComponent, EstadoBadgeComponent,
    EstructuraPanelComponent, PoolFormComponent, LaneFormComponent,
  ],
  providers: [EditorStore],
  templateUrl: './proceso-editor-page.component.html',
})
export class ProcesoEditorPageComponent {
  readonly store = inject(EditorStore);
  readonly sesion = inject(SesionStore);
  private readonly route = inject(ActivatedRoute);
  private readonly poolService = inject(PoolService);
  private readonly laneService = inject(LaneService);

  cargando = signal(true);
  guardando = signal(false);
  problema = signal<ProblemDetail | null>(null);
  aviso = signal('');
  confirmacion = signal<Confirmacion | null>(null);

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('id'))),
        switchMap((id) => {
          this.cargando.set(true);
          return this.store.cargar(id).pipe(finalize(() => this.cargando.set(false)));
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  // ---------- Pools (HU-21, HU-24) ----------

  guardarPool(datos: PoolRequest): void {
    const seleccion = this.store.seleccion();
    const proceso = this.store.proceso();
    if (!proceso || seleccion?.tipo !== 'pool') {
      return;
    }
    const nuevo = seleccion.id === null;
    const peticion = nuevo ? this.poolService.crear(proceso.id, datos) : this.poolService.actualizar(seleccion.id!, datos);
    this.ejecutar(peticion, nuevo ? `Pool "${datos.nombre}" agregado.` : `Pool "${datos.nombre}" actualizado.`, true);
  }

  cambiarPermiso(permiso: PermisoEstructura): void {
    const pool = this.store.poolPropietario();
    if (pool) {
      this.ejecutar(this.poolService.cambiarPermisos(pool.id, permiso), 'Permisos de estructura actualizados.', false);
    }
  }

  eliminarPool(pool: Pool): void {
    this.confirmacion.set({
      titulo: 'Eliminar pool',
      mensaje: `¿Eliminar el pool "${pool.nombre}" del diagrama?`,
      accion: () => this.poolService.eliminar(pool.id),
      exito: `Pool "${pool.nombre}" eliminado.`,
    });
  }

  // ---------- Lanes (HU-22) ----------

  guardarLane(rolProcesoId: number): void {
    const seleccion = this.store.seleccion();
    if (seleccion?.tipo !== 'lane') {
      return;
    }
    const nueva = seleccion.id === null;
    const peticion = nueva
      ? this.laneService.crear(seleccion.poolId, rolProcesoId)
      : this.laneService.actualizar(seleccion.id!, rolProcesoId);
    this.ejecutar(peticion, nueva ? 'Lane agregada.' : 'Rol de la lane actualizado.', true);
  }

  /** Sube o baja una lane: se envía el orden completo del pool. */
  moverLane({ lane, direccion }: MovimientoLane): void {
    const pool = this.store.pools().find((p) => p.id === lane.poolId);
    if (!pool) {
      return;
    }
    const ids = [...pool.lanes].sort((a, b) => a.orden - b.orden).map((l) => l.id);
    const i = ids.indexOf(lane.id);
    const j = i + direccion;
    if (i < 0 || j < 0 || j >= ids.length) {
      return;
    }
    [ids[i], ids[j]] = [ids[j], ids[i]];
    this.ejecutar(this.laneService.reordenar(pool.id, ids), 'Orden de las lanes actualizado.', false);
  }

  eliminarLane(lane: Lane): void {
    this.confirmacion.set({
      titulo: 'Eliminar lane',
      mensaje: `¿Eliminar la lane "${lane.nombre}"? El rol de proceso sigue en el catálogo.`,
      accion: () => this.laneService.eliminar(lane.id),
      exito: `Lane "${lane.nombre}" eliminada.`,
    });
  }

  confirmar(): void {
    const confirmacion = this.confirmacion();
    this.confirmacion.set(null);
    if (confirmacion) {
      this.ejecutar(confirmacion.accion(), confirmacion.exito, true);
    }
  }

  cerrarPanel(): void {
    this.store.seleccionar(null);
    this.problema.set(null);
  }

  /** Hace el cambio y luego recarga el diagrama (switchMap: una petición después de la otra). */
  private ejecutar(peticion: Observable<unknown>, exito: string, cerrarPanel: boolean): void {
    this.guardando.set(true);
    this.problema.set(null);
    this.aviso.set('');
    peticion
      .pipe(
        switchMap(() => this.store.recargar()),
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: () => {
          this.aviso.set(exito);
          if (cerrarPanel) {
            this.store.seleccionar(null);
          }
        },
        error: (err) => this.problema.set(problemaDe(err)),
      });
  }
}
