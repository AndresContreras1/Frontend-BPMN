import { Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { catchError, debounceTime, finalize, Observable, of, switchMap } from 'rxjs';

import { AlertaErrorComponent } from '../../components/alerta-error/alerta-error.component';
import { ConfirmarModalComponent } from '../../components/confirmar-modal/confirmar-modal.component';
import { PageTitleComponent } from '../../components/page-title/page-title.component';
import { PaginadorComponent } from '../../components/paginador/paginador.component';
import { Columna, TablaGenericaComponent } from '../../components/tabla-generica/tabla-generica.component';
import { problemaDe } from '../../core/services/errores';
import { SesionStore } from '../../core/services/sesion.store';
import { ProblemDetail } from '../../models/problem-detail.model';
import { RolProceso, RolProcesoRequest } from '../../models/rol-proceso.model';
import { RolProcesoService } from '../../service/rol-proceso.service';
import { RolFormComponent } from './components/rol-form/rol-form.component';
import { RolUsoComponent } from './components/rol-uso/rol-uso.component';

/**
 * HU-17 a HU-20: catálogo de roles de proceso. Todos lo consultan; el administrador crea, edita y
 * elimina. Un rol asignado a lanes no se puede eliminar: se muestra en qué procesos se usa.
 */
@Component({
  selector: 'app-roles-proceso',
  imports: [
    PageTitleComponent, PaginadorComponent, AlertaErrorComponent, ConfirmarModalComponent, TablaGenericaComponent,
    RolFormComponent, RolUsoComponent,
  ],
  templateUrl: './roles-proceso.component.html',
})
export class RolesProcesoComponent {
  private readonly rolProcesoService = inject(RolProcesoService);
  readonly sesion = inject(SesionStore);

  texto = signal('');
  page = signal(0);
  orden = signal('nombre,asc');
  private readonly recargar = signal(0);

  cargando = signal(true);
  problema = signal<ProblemDetail | null>(null);
  aviso = signal('');

  /** undefined: formulario cerrado; null: rol nuevo; un rol: edición. */
  editando = signal<RolProceso | null | undefined>(undefined);
  guardando = signal(false);
  problemaForm = signal<ProblemDetail | null>(null);
  seleccionado = signal<RolProceso | null>(null);
  porEliminar = signal<RolProceso | null>(null);

  columnas: Columna[] = [
    { clave: 'nombre', titulo: 'Rol', ordenable: true },
    { clave: '', titulo: 'Uso' },
    { clave: '', titulo: 'Acciones', clase: 'text-end' },
  ];

  private readonly consulta = computed(() => ({
    nombre: this.texto(),
    paginacion: { page: this.page(), size: 10, sort: this.orden() },
    recarga: this.recargar(),
  }));

  resultado = toSignal(
    toObservable(this.consulta).pipe(
      debounceTime(300),
      switchMap((c) => {
        this.cargando.set(true);
        return this.rolProcesoService.listar(c.nombre, c.paginacion).pipe(
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

  nombresProcesos(rol: RolProceso): string {
    return rol.procesos.map((p) => p.nombre).join(', ');
  }

  buscar(texto: string): void {
    this.texto.set(texto);
    this.page.set(0);
  }

  ordenar(orden: string): void {
    this.orden.set(orden);
    this.page.set(0);
  }

  nuevo(): void {
    this.seleccionado.set(null);
    this.problemaForm.set(null);
    this.editando.set(null);
  }

  editar(rol: RolProceso): void {
    this.seleccionado.set(null);
    this.problemaForm.set(null);
    this.editando.set(rol);
  }

  verUso(rol: RolProceso): void {
    this.editando.set(undefined);
    this.seleccionado.set(rol);
  }

  guardar(datos: RolProcesoRequest): void {
    const rol = this.editando();
    this.guardando.set(true);
    this.problemaForm.set(null);
    const peticion: Observable<RolProceso> = rol
      ? this.rolProcesoService.actualizar(rol.id, datos)
      : this.rolProcesoService.crear(datos);

    peticion.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: (guardado) => {
        this.aviso.set(rol ? `Rol "${guardado.nombre}" actualizado.` : `Rol "${guardado.nombre}" creado.`);
        this.editando.set(undefined);
        this.recargar.update((n) => n + 1);
      },
      error: (err) => this.problemaForm.set(problemaDe(err)),
    });
  }

  confirmarEliminar(): void {
    const rol = this.porEliminar();
    this.porEliminar.set(null);
    if (!rol) {
      return;
    }
    this.problema.set(null);
    this.aviso.set('');
    this.rolProcesoService.eliminar(rol.id).subscribe({
      next: () => {
        this.aviso.set(`Rol "${rol.nombre}" eliminado.`);
        if (this.seleccionado()?.id === rol.id) {
          this.seleccionado.set(null);
        }
        this.recargar.update((n) => n + 1);
      },
      error: (err) => this.problema.set(problemaDe(err)),
    });
  }
}
