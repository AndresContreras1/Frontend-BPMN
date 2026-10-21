import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { EstadoBadgeComponent } from '../../components/estado-badge/estado-badge.component';
import { IndicadorComponent } from '../../components/indicador/indicador.component';
import { problemaDe } from '../../core/services/errores';
import { SesionStore } from '../../core/services/sesion.store';
import { ProblemDetail } from '../../models/problem-detail.model';
import { Proceso, ResumenProcesos } from '../../models/proceso.model';
import { ProcesoService } from '../../service/proceso.service';
import { RolProcesoService } from '../../service/rol-proceso.service';
import { UsuarioService } from '../../service/usuario.service';

/** Lo que muestra el inicio, cargado de una sola vez. */
interface DatosInicio {
  /** Totales para las tarjetas (activos, borradores, publicados...). */
  resumen: ResumenProcesos;
  /** Los procesos modificados hace poco. */
  recientes: Proceso[];
  /** Cantidad de usuarios de la empresa. */
  usuarios: number;
  /** Cantidad de roles de proceso. */
  roles: number;
}

/**
 * Inicio de la empresa (HU-07): indicadores de los procesos, los modificados hace poco y accesos rápidos
 * según el rol. Las cuatro consultas no dependen entre sí, así que van en paralelo con forkJoin.
 */
@Component({
  selector: 'app-inicio',
  imports: [DatePipe, RouterLink, IndicadorComponent, EstadoBadgeComponent],
  templateUrl: './inicio.component.html',
})
export class InicioComponent implements OnInit {
  // Servicios que traen los datos de la API
  private readonly procesoService = inject(ProcesoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly rolProcesoService = inject(RolProcesoService);
  /** Datos del usuario con sesión (nombre, empresa, permisos); el template lo usa para mostrar u ocultar botones. */
  readonly sesion = inject(SesionStore);

  /** Un solo estado describe la pantalla, en vez de varias banderas sueltas. */
  estado = signal<'cargando' | 'listo' | 'error'>('cargando');
  /** Datos ya cargados; null mientras no lleguen. */
  datos = signal<DatosInicio | null>(null);
  /** Error de la API si la carga falla. */
  problema = signal<ProblemDetail | null>(null);
  /** Fecha de hoy, que se muestra arriba. */
  readonly hoy = new Date();

  /** Primer nombre del usuario para el saludo ("Hola, Ana"). */
  primerNombre = computed(() => this.sesion.usuario()?.nombre.split(' ')[0] ?? '');

  /** Porcentaje de procesos activos que ya están publicados. */
  avancePublicacion = computed(() => {
    // Resumen cargado (puede ser undefined si aún no hay datos)
    const resumen = this.datos()?.resumen;
    // Publicados entre el total, en porcentaje redondeado; 0 si no hay procesos (evita dividir por cero)
    return resumen && resumen.total > 0 ? Math.round((resumen.publicados / resumen.total) * 100) : 0;
  });

  /** Al crear la pantalla se cargan los datos. */
  ngOnInit(): void {
    this.cargar();
  }

  /** Pide todo a la API a la vez; también se usa para el botón "Reintentar". */
  cargar(): void {
    // Vuelve a mostrar el estado de carga y borra el error anterior
    this.estado.set('cargando');
    this.problema.set(null);
    // forkJoin lanza las cuatro consultas juntas y espera a que terminen todas
    forkJoin({
      // Totales de los procesos
      resumen: this.procesoService.resumen(),
      // Los 5 procesos activos modificados más recientemente (página 0, ordenados por fecha descendente)
      recientes: this.procesoService.listar(
        { nombre: '', estado: '', categoria: '', activo: true },
        { page: 0, size: 5, sort: 'modificadoEn,desc' },
      ),
      // Solo interesa el total, por eso se pide una página de tamaño 1
      usuarios: this.usuarioService.listar('', { page: 0, size: 1 }),
      // Igual: una página de tamaño 1 y se lee totalElements
      roles: this.rolProcesoService.listar('', { page: 0, size: 1 }),
    }).subscribe({
      // Todo llegó bien: se guardan los datos y se muestra la pantalla lista
      next: (r) => {
        this.datos.set({
          resumen: r.resumen,
          recientes: r.recientes.content,
          usuarios: r.usuarios.totalElements,
          roles: r.roles.totalElements,
        });
        this.estado.set('listo');
      },
      // Alguna consulta falló: se guarda el error para mostrarlo
      error: (err) => {
        this.problema.set(problemaDe(err));
        this.estado.set('error');
      },
    });
  }
}
