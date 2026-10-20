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
  resumen: ResumenProcesos;
  recientes: Proceso[];
  usuarios: number;
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
  private readonly procesoService = inject(ProcesoService);
  private readonly usuarioService = inject(UsuarioService);
  private readonly rolProcesoService = inject(RolProcesoService);
  readonly sesion = inject(SesionStore);

  /** Un solo estado describe la pantalla, en vez de varias banderas sueltas. */
  estado = signal<'cargando' | 'listo' | 'error'>('cargando');
  datos = signal<DatosInicio | null>(null);
  problema = signal<ProblemDetail | null>(null);
  readonly hoy = new Date();

  primerNombre = computed(() => this.sesion.usuario()?.nombre.split(' ')[0] ?? '');

  /** Porcentaje de procesos activos que ya están publicados. */
  avancePublicacion = computed(() => {
    const resumen = this.datos()?.resumen;
    return resumen && resumen.total > 0 ? Math.round((resumen.publicados / resumen.total) * 100) : 0;
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.estado.set('cargando');
    this.problema.set(null);
    forkJoin({
      resumen: this.procesoService.resumen(),
      recientes: this.procesoService.listar(
        { nombre: '', estado: '', categoria: '', activo: true },
        { page: 0, size: 5, sort: 'modificadoEn,desc' },
      ),
      usuarios: this.usuarioService.listar('', { page: 0, size: 1 }),
      roles: this.rolProcesoService.listar('', { page: 0, size: 1 }),
    }).subscribe({
      next: (r) => {
        this.datos.set({
          resumen: r.resumen,
          recientes: r.recientes.content,
          usuarios: r.usuarios.totalElements,
          roles: r.roles.totalElements,
        });
        this.estado.set('listo');
      },
      error: (err) => {
        this.problema.set(problemaDe(err));
        this.estado.set('error');
      },
    });
  }
}
