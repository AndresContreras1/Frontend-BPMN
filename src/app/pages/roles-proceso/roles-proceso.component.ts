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
  /** Servicio que habla con la API de roles de proceso. */
  private readonly rolProcesoService = inject(RolProcesoService);
  /** Datos de la sesion (rol del usuario); publico porque el HTML lo usa para decidir que botones mostrar. */
  readonly sesion = inject(SesionStore);

  /** Texto de la busqueda por nombre. */
  texto = signal('');
  /** Pagina actual (empieza en 0). */
  page = signal(0);
  /** Orden en formato "campo,direccion" que entiende la API. */
  orden = signal('nombre,asc');
  /** Contador que se incrementa para forzar una nueva consulta (tras crear, editar o eliminar). */
  private readonly recargar = signal(0);

  /** True mientras llega la lista. */
  cargando = signal(true);
  /** Error de la API al listar o eliminar. */
  problema = signal<ProblemDetail | null>(null);
  /** Mensaje de exito tras crear, editar o eliminar. */
  aviso = signal('');

  /** undefined: formulario cerrado; null: rol nuevo; un rol: edición. */
  editando = signal<RolProceso | null | undefined>(undefined);
  /** True mientras se envia el formulario del rol. */
  guardando = signal(false);
  /** Error de la API al guardar; se le pasa al formulario para pintarlo en los campos. */
  problemaForm = signal<ProblemDetail | null>(null);
  /** Rol cuyo panel de uso (procesos e historial) esta abierto. */
  seleccionado = signal<RolProceso | null>(null);
  /** Rol pendiente de confirmar eliminacion; mientras no es null el modal esta abierto. */
  porEliminar = signal<RolProceso | null>(null);

  /** Columnas de la tabla; solo el nombre se puede ordenar. */
  columnas: Columna[] = [
    { clave: 'nombre', titulo: 'Rol', ordenable: true },
    { clave: '', titulo: 'Uso' },
    { clave: '', titulo: 'Acciones', clase: 'text-end' },
  ];

  /**
   * Junta lo que define la consulta (busqueda, paginacion y contador de recarga).
   * Al ser computed, cambia sola cuando cambia cualquiera de esas signals.
   */
  private readonly consulta = computed(() => ({
    nombre: this.texto(),
    paginacion: { page: this.page(), size: 10, sort: this.orden() },
    recarga: this.recargar(),
  }));

  /** Pagina de roles como signal (null hasta que llega la primera respuesta). */
  resultado = toSignal(
    toObservable(this.consulta).pipe(
      // debounceTime: espera 300 ms sin cambios antes de consultar, para no llamar a la API en cada letra
      debounceTime(300),
      // switchMap: si llega una consulta nueva, cancela la anterior que siga en vuelo
      switchMap((c) => {
        this.cargando.set(true);
        return this.rolProcesoService.listar(c.nombre, c.paginacion).pipe(
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

  /** Nombres de los procesos que usan el rol, separados por coma (para el tooltip). */
  nombresProcesos(rol: RolProceso): string {
    return rol.procesos.map((p) => p.nombre).join(', ');
  }

  /** Aplica la busqueda y vuelve a la primera pagina. */
  buscar(texto: string): void {
    this.texto.set(texto);
    this.page.set(0);
  }

  /** Cambia el orden (lo emite la tabla) y vuelve a la primera pagina. */
  ordenar(orden: string): void {
    this.orden.set(orden);
    this.page.set(0);
  }

  /** Abre el formulario para crear un rol (editando = null significa "nuevo"). */
  nuevo(): void {
    this.seleccionado.set(null);
    this.problemaForm.set(null);
    this.editando.set(null);
  }

  /** Abre el formulario con los datos del rol para editarlo. */
  editar(rol: RolProceso): void {
    this.seleccionado.set(null);
    this.problemaForm.set(null);
    this.editando.set(rol);
  }

  /** Abre el panel de uso del rol; cierra el formulario si estaba abierto (comparten el mismo espacio). */
  verUso(rol: RolProceso): void {
    this.editando.set(undefined);
    this.seleccionado.set(rol);
  }

  /** Recibe los datos del formulario y crea o actualiza el rol segun el modo. */
  guardar(datos: RolProcesoRequest): void {
    const rol = this.editando();
    this.guardando.set(true);
    this.problemaForm.set(null);
    // Si hay un rol en edicion se actualiza; si es null se crea uno nuevo
    const peticion: Observable<RolProceso> = rol
      ? this.rolProcesoService.actualizar(rol.id, datos)
      : this.rolProcesoService.crear(datos);

    peticion.pipe(finalize(() => this.guardando.set(false))).subscribe({
      next: (guardado) => {
        this.aviso.set(rol ? `Rol "${guardado.nombre}" actualizado.` : `Rol "${guardado.nombre}" creado.`);
        // Se cierra el formulario y se recarga la lista
        this.editando.set(undefined);
        this.recargar.update((n) => n + 1);
      },
      error: (err) => this.problemaForm.set(problemaDe(err)),
    });
  }

  /** Se ejecuta al confirmar en el modal: elimina el rol y recarga la lista. */
  confirmarEliminar(): void {
    const rol = this.porEliminar();
    // Se cierra el modal en cualquier caso
    this.porEliminar.set(null);
    if (!rol) {
      return;
    }
    this.problema.set(null);
    this.aviso.set('');
    this.rolProcesoService.eliminar(rol.id).subscribe({
      next: () => {
        this.aviso.set(`Rol "${rol.nombre}" eliminado.`);
        // Si el panel de uso mostraba justo este rol, se cierra porque ya no existe
        if (this.seleccionado()?.id === rol.id) {
          this.seleccionado.set(null);
        }
        this.recargar.update((n) => n + 1);
      },
      error: (err) => this.problema.set(problemaDe(err)),
    });
  }
}
