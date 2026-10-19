import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, debounceTime, finalize, of, switchMap } from 'rxjs';

import { AlertaErrorComponent } from '../../components/alerta-error/alerta-error.component';
import { ConfirmarModalComponent } from '../../components/confirmar-modal/confirmar-modal.component';
import { PageTitleComponent } from '../../components/page-title/page-title.component';
import { PaginadorComponent } from '../../components/paginador/paginador.component';
import { Columna, TablaGenericaComponent } from '../../components/tabla-generica/tabla-generica.component';
import { problemaDe } from '../../core/services/errores';
import { SesionStore } from '../../core/services/sesion.store';
import { ProblemDetail } from '../../models/problem-detail.model';
import { RolAcceso, ROLES_ACCESO, Usuario } from '../../models/usuario.model';
import { UsuarioService } from '../../service/usuario.service';

/**
 * HU-02: usuarios de la empresa. Todos los roles ven la lista; solo el administrador invita,
 * cambia el rol de acceso y desactiva o reactiva cuentas.
 */
@Component({
  selector: 'app-usuarios',
  imports: [
    DatePipe, RouterLink, PageTitleComponent, PaginadorComponent, AlertaErrorComponent,
    ConfirmarModalComponent, TablaGenericaComponent,
  ],
  templateUrl: './usuarios.component.html',
})
export class UsuariosComponent {
  private readonly usuarioService = inject(UsuarioService);
  readonly sesion = inject(SesionStore);
  readonly roles = ROLES_ACCESO;

  /** Nombre del usuario recién invitado (query param que deja el formulario). */
  creado = input<string>();

  texto = signal('');
  page = signal(0);
  orden = signal('nombre,asc');
  private readonly recargar = signal(0);

  cargando = signal(false);
  problema = signal<ProblemDetail | null>(null);
  aviso = signal('');
  porDesactivar = signal<Usuario | null>(null);

  columnas = computed<Columna[]>(() => {
    const columnas: Columna[] = [
      { clave: 'nombre', titulo: 'Nombre', ordenable: true },
      { clave: 'correo', titulo: 'Correo', ordenable: true },
      { clave: 'rol', titulo: 'Rol de acceso', ordenable: true },
      { clave: 'activo', titulo: 'Estado', ordenable: true },
      { clave: 'creadoEn', titulo: 'Creado', ordenable: true },
    ];
    return this.sesion.esAdministrador() ? [...columnas, { clave: '', titulo: 'Acciones', clase: 'text-end' }] : columnas;
  });

  private readonly consulta = computed(() => ({
    nombre: this.texto(),
    page: this.page(),
    sort: this.orden(),
    recarga: this.recargar(),
  }));

  /** Búsqueda con espera de 300 ms; switchMap descarta la respuesta de una búsqueda vieja. */
  resultado = toSignal(
    toObservable(this.consulta).pipe(
      debounceTime(300),
      switchMap((c) => {
        this.cargando.set(true);
        return this.usuarioService.listar(c.nombre, { page: c.page, size: 10, sort: c.sort }).pipe(
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

  buscar(valor: string): void {
    this.texto.set(valor);
    this.page.set(0);
  }

  ordenar(orden: string): void {
    this.orden.set(orden);
    this.page.set(0);
  }

  esYo(usuario: Usuario): boolean {
    return usuario.id === this.sesion.usuario()?.id;
  }

  cambiarRol(usuario: Usuario, evento: Event): void {
    const select = evento.target as HTMLSelectElement;
    const rol = select.value as RolAcceso;
    if (rol === usuario.rol) {
      return;
    }
    this.limpiarMensajes();
    this.usuarioService.cambiarRol(usuario.id, rol).subscribe({
      next: (actualizado) => {
        this.aviso.set(`${actualizado.nombre} ahora tiene el rol ${actualizado.rol}.`);
        this.recargar.update((n) => n + 1);
      },
      error: (err) => {
        select.value = usuario.rol;
        this.problema.set(problemaDe(err));
      },
    });
  }

  confirmarDesactivar(): void {
    const usuario = this.porDesactivar();
    this.porDesactivar.set(null);
    if (!usuario) {
      return;
    }
    this.limpiarMensajes();
    this.usuarioService.desactivar(usuario.id).subscribe({
      next: (u) => {
        this.aviso.set(`${u.nombre} quedó desactivado: ya no puede iniciar sesión.`);
        this.recargar.update((n) => n + 1);
      },
      error: (err) => this.problema.set(problemaDe(err)),
    });
  }

  activar(usuario: Usuario): void {
    this.limpiarMensajes();
    this.usuarioService.activar(usuario.id).subscribe({
      next: (u) => {
        this.aviso.set(`${u.nombre} quedó activo de nuevo.`);
        this.recargar.update((n) => n + 1);
      },
      error: (err) => this.problema.set(problemaDe(err)),
    });
  }

  private limpiarMensajes(): void {
    this.problema.set(null);
    this.aviso.set('');
  }
}
