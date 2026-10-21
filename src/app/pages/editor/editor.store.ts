import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, forkJoin, map, Observable, of, tap } from 'rxjs';

import { problemaDe } from '../../core/services/errores';
import { SesionStore } from '../../core/services/sesion.store';
import { Diagrama } from '../../models/diagrama.model';
import { ProblemDetail } from '../../models/problem-detail.model';
import { RolProcesoResumen } from '../../models/rol-proceso.model';
import { DiagramaService } from '../../service/diagrama.service';
import { RolProcesoService } from '../../service/rol-proceso.service';

/** Qué elemento está abierto en el panel lateral; id null significa "nuevo". */
export type Seleccion =
  | { tipo: 'pool'; id: number | null }
  | { tipo: 'lane'; id: number | null; poolId: number };

/**
 * Estado compartido del editor (un servicio por página: va en providers del componente).
 * Guarda el diagrama con signals de solo lectura hacia afuera; los componentes hijos reciben
 * los datos por input() y avisan con output().
 */
@Injectable()
export class EditorStore {
  private readonly diagramaService = inject(DiagramaService);
  private readonly rolProcesoService = inject(RolProcesoService);
  private readonly sesion = inject(SesionStore);

  private readonly _diagrama = signal<Diagrama | null>(null);
  private readonly _roles = signal<RolProcesoResumen[]>([]);
  private readonly _problemaCarga = signal<ProblemDetail | null>(null);
  private readonly _seleccion = signal<Seleccion | null>(null);

  readonly diagrama = this._diagrama.asReadonly();
  readonly roles = this._roles.asReadonly();
  readonly problemaCarga = this._problemaCarga.asReadonly();
  readonly seleccion = this._seleccion.asReadonly();

  readonly proceso = computed(() => this._diagrama()?.proceso ?? null);
  readonly pools = computed(() => [...(this._diagrama()?.pools ?? [])].sort((a, b) => a.orden - b.orden));
  readonly nodos = computed(() => this._diagrama()?.nodos ?? []);
  readonly arcos = computed(() => this._diagrama()?.arcos ?? []);
  readonly mensajes = computed(() => this._diagrama()?.mensajes ?? []);
  readonly advertencias = computed(() => this._diagrama()?.advertencias ?? []);
  readonly poolPropietario = computed(() => this.pools().find((p) => p.tipo === 'PROPIETARIO') ?? null);

  /** Proceso propio, activo y usuario administrador o editor. */
  readonly editable = computed(() => {
    const p = this.proceso();
    return !!p && p.propio && p.activo && this.sesion.puedeEditar();
  });

  /** HU-24: el editor cambia pools y lanes solo si el administrador lo permite. */
  readonly estructuraEditable = computed(
    () => this.editable() && (this.sesion.esAdministrador() || this.poolPropietario()?.permisoEstructura !== 'SOLO_ADMINISTRADOR'),
  );

  readonly poolSeleccionado = computed(() => {
    const s = this._seleccion();
    return s?.tipo === 'pool' && s.id !== null ? (this.pools().find((p) => p.id === s.id) ?? null) : null;
  });

  readonly laneSeleccionada = computed(() => {
    const s = this._seleccion();
    if (s?.tipo !== 'lane' || s.id === null) {
      return null;
    }
    return this.pools().flatMap((p) => p.lanes).find((l) => l.id === s.id) ?? null;
  });

  /** Pool en el que se crea o edita la lane abierta. */
  readonly poolDeLane = computed(() => {
    const s = this._seleccion();
    return s?.tipo === 'lane' ? (this.pools().find((p) => p.id === s.poolId) ?? null) : null;
  });

  /** Diagrama y catálogo de roles a la vez (forkJoin): se muestran juntos. */
  cargar(procesoId: number): Observable<void> {
    this._problemaCarga.set(null);
    this._seleccion.set(null);
    return forkJoin({
      diagrama: this.diagramaService.obtener(procesoId),
      // Sin el catálogo igual se puede ver el diagrama: su error no debe tumbar la carga
      roles: this.rolProcesoService.listar('', { page: 0, size: 200, sort: 'nombre,asc' }).pipe(
        map((pagina) => pagina.content.map((r) => ({ id: r.id, nombre: r.nombre }))),
        catchError(() => of([] as RolProcesoResumen[])),
      ),
    }).pipe(
      tap(({ diagrama, roles }) => {
        this._diagrama.set(diagrama);
        this._roles.set(roles);
      }),
      map(() => undefined),
      catchError((err) => {
        this._diagrama.set(null);
        this._problemaCarga.set(problemaDe(err));
        return of(undefined);
      }),
    );
  }

  /** Después de cada cambio se vuelve a pedir el diagrama: así las advertencias quedan al día. */
  recargar(): Observable<Diagrama> {
    const id = this.proceso()?.id;
    if (!id) {
      return of();
    }
    return this.diagramaService.obtener(id).pipe(tap((diagrama) => this._diagrama.set(diagrama)));
  }

  seleccionar(seleccion: Seleccion | null): void {
    this._seleccion.set(seleccion);
  }
}
