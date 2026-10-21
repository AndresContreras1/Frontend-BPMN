import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
export class UsuariosComponent implements OnInit {
  /** Servicio que habla con la API de usuarios. */
  private readonly usuarioService = inject(UsuarioService);
  /** Datos de la sesion (usuario actual y su rol); publico porque el HTML lo consulta. */
  readonly sesion = inject(SesionStore);
  /** Lista de roles de acceso disponibles, para el select de cada fila. */
  readonly roles = ROLES_ACCESO;

  /** Da acceso a los parametros de la URL (query params). */
  private readonly route = inject(ActivatedRoute);

  /** ?creado=<nombre>: aviso al volver de invitar un usuario (HU-02). */
  creado = signal<string | null>(null);

  /** Texto de la busqueda por nombre. */
  texto = signal('');
  /** Pagina actual (empieza en 0). */
  page = signal(0);
  /** Orden en formato "campo,direccion" que entiende la API. */
  orden = signal('nombre,asc');
  /** Contador que se incrementa para forzar una nueva consulta (tras cambiar rol o estado). */
  private readonly recargar = signal(0);

  /** True mientras llega la lista. */
  cargando = signal(true);
  /** Error de la API para mostrar en la alerta. */
  problema = signal<ProblemDetail | null>(null);
  /** Mensaje de exito tras una accion. */
  aviso = signal('');
  /** Usuario pendiente de confirmar desactivacion; mientras no es null el modal esta abierto. */
  porDesactivar = signal<Usuario | null>(null);

  /** Columnas de la tabla; la de acciones solo existe para el administrador. */
  columnas = computed<Columna[]>(() => {
    const columnas: Columna[] = [
      { clave: 'nombre', titulo: 'Nombre', ordenable: true },
      { clave: 'correo', titulo: 'Correo', ordenable: true },
      { clave: 'rol', titulo: 'Rol de acceso', ordenable: true },
      { clave: 'activo', titulo: 'Estado', ordenable: true },
      { clave: 'creadoEn', titulo: 'Creado', ordenable: true },
    ];
    // Si es administrador se agrega al final la columna de acciones (spread para copiar el arreglo)
    return this.sesion.esAdministrador() ? [...columnas, { clave: '', titulo: 'Acciones', clase: 'text-end' }] : columnas;
  });

  /**
   * Junta lo que define la consulta (busqueda, pagina, orden y contador de recarga).
   * Al ser computed, cambia sola cuando cambia cualquiera de esas signals.
   */
  private readonly consulta = computed(() => ({
    nombre: this.texto(),
    page: this.page(),
    sort: this.orden(),
    recarga: this.recargar(),
  }));

  /** Búsqueda con espera de 300 ms; switchMap descarta la respuesta de una búsqueda vieja. */
  resultado = toSignal(
    toObservable(this.consulta).pipe(
      // debounceTime: espera 300 ms sin cambios antes de consultar, para no llamar a la API en cada letra
      debounceTime(300),
      switchMap((c) => {
        this.cargando.set(true);
        return this.usuarioService.listar(c.nombre, { page: c.page, size: 10, sort: c.sort }).pipe(
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

  /** Al iniciar: lee de la URL el nombre del usuario recien invitado, si viene. */
  ngOnInit(): void {
    this.creado.set(this.route.snapshot.queryParamMap.get('creado'));
  }

  /** Aplica la busqueda y vuelve a la primera pagina. */
  buscar(valor: string): void {
    this.texto.set(valor);
    this.page.set(0);
  }

  /** Cambia el orden (lo emite la tabla) y vuelve a la primera pagina. */
  ordenar(orden: string): void {
    this.orden.set(orden);
    this.page.set(0);
  }

  /** True si la fila es el usuario con sesion iniciada (no puede cambiarse el rol ni desactivarse). */
  esYo(usuario: Usuario): boolean {
    return usuario.id === this.sesion.usuario()?.id;
  }

  /** Cambia el rol de acceso de un usuario cuando se elige otro en el select de su fila. */
  cambiarRol(usuario: Usuario, evento: Event): void {
    // Se guarda el select para poder devolverlo al valor anterior si la API rechaza el cambio
    const select = evento.target as HTMLSelectElement;
    const rol = select.value as RolAcceso;
    // Si eligio el mismo rol no hay nada que hacer
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
        // El select ya muestra el rol nuevo; se regresa al original porque no se guardo
        select.value = usuario.rol;
        this.problema.set(problemaDe(err));
      },
    });
  }

  /** Se ejecuta al confirmar en el modal: desactiva la cuenta (ya no podra iniciar sesion). */
  confirmarDesactivar(): void {
    const usuario = this.porDesactivar();
    // Se cierra el modal en cualquier caso
    this.porDesactivar.set(null);
    if (!usuario) {
      return;
    }
    this.limpiarMensajes();
    // false = desactivar
    this.usuarioService.cambiarEstado(usuario.id, false).subscribe({
      next: (u) => {
        this.aviso.set(`${u.nombre} quedó desactivado: ya no puede iniciar sesión.`);
        this.recargar.update((n) => n + 1);
      },
      error: (err) => this.problema.set(problemaDe(err)),
    });
  }

  /** Reactiva una cuenta desactivada (no pide confirmacion porque no es destructivo). */
  activar(usuario: Usuario): void {
    this.limpiarMensajes();
    // true = activar
    this.usuarioService.cambiarEstado(usuario.id, true).subscribe({
      next: (u) => {
        this.aviso.set(`${u.nombre} quedó activo de nuevo.`);
        this.recargar.update((n) => n + 1);
      },
      error: (err) => this.problema.set(problemaDe(err)),
    });
  }

  /** Borra el aviso y el error anteriores antes de una nueva accion. */
  private limpiarMensajes(): void {
    this.problema.set(null);
    this.aviso.set('');
  }
}
