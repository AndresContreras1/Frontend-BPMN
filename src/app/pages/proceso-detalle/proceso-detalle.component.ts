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
import { DiagramaVistaComponent } from './components/diagrama-vista/diagrama-vista.component';
import { HistorialTablaComponent } from './components/historial-tabla/historial-tabla.component';

/**
 * Ficha del proceso (HU-07) con su diagrama completo en solo lectura y sus acciones: editar (HU-05), publicar o volver a borrador (HU-04),
 * eliminar (HU-06), historial y compartir (HU-23). Un proceso compartido por otra empresa o eliminado
 * se muestra en solo lectura.
 */
@Component({
  selector: 'app-proceso-detalle',
  // Todo lo que se usa en el HTML debe estar importado aqui (componentes standalone, pipe date y routerLink)
  imports: [
    DatePipe, RouterLink, PageTitleComponent, AlertaErrorComponent, ConfirmarModalComponent, EstadoBadgeComponent,
    HistorialTablaComponent, CompartirPanelComponent, DiagramaVistaComponent,
  ],
  templateUrl: './proceso-detalle.component.html',
})
export class ProcesoDetalleComponent {
  /** Da acceso al id que viene en la URL (/procesos/:id). */
  private readonly route = inject(ActivatedRoute);
  /** Sirve para navegar a otra pagina desde el codigo (despues de eliminar). */
  private readonly router = inject(Router);
  /** Servicio que habla con la API de procesos. */
  private readonly procesoService = inject(ProcesoService);
  /** Datos de la sesion (rol del usuario); es publico porque el HTML tambien lo puede consultar. */
  readonly sesion = inject(SesionStore);

  /** Proceso cargado; null mientras no llega o si hubo error. */
  proceso = signal<Proceso | null>(null);
  /** True mientras se espera la respuesta de la API (muestra el spinner). */
  cargando = signal(true);
  /** Error al cargar (404: no existe o es de otra empresa). */
  problemaCarga = signal<ProblemDetail | null>(null);
  /** Error de una accion (publicar, volver a borrador, eliminar); se muestra en la alerta. */
  problema = signal<ProblemDetail | null>(null);
  /** Mensaje verde de exito despues de cambiar el estado. */
  aviso = signal('');
  /** Deshabilita los botones de publicar/borrador mientras se guarda el cambio. */
  cambiandoEstado = signal(false);
  /** Controla si el modal de confirmacion de eliminar esta abierto. */
  confirmandoEliminar = signal(false);
  /** Contador que se incrementa tras un cambio; el historial lo observa para volver a cargarse. */
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
        // Toma el parametro "id" de la URL y lo convierte a numero
        map((params) => Number(params.get('id'))),
        switchMap((id) => {
          // Antes de pedir el proceso se reinicia el estado de carga y de error
          this.cargando.set(true);
          this.problemaCarga.set(null);
          return this.procesoService.obtener(id).pipe(
            // Si falla, se guarda el error y se emite null para que el flujo no se rompa
            catchError((err) => {
              this.problemaCarga.set(problemaDe(err));
              return of(null);
            }),
            // finalize corre tanto si salio bien como mal: apaga el spinner
            finalize(() => this.cargando.set(false)),
          );
        }),
        // Se cancela la suscripcion sola cuando el componente se destruye
        takeUntilDestroyed(),
      )
      .subscribe((proceso) => this.proceso.set(proceso));
  }

  /** HU-04: publicar exige un diagrama coherente; la API responde 409 con los motivos si no lo es. */
  cambiarEstado(estado: EstadoProceso): void {
    const p = this.proceso();
    // Sin proceso cargado no hay nada que cambiar
    if (!p) {
      return;
    }
    // Se limpia lo anterior y se bloquean los botones mientras dura la peticion
    this.cambiandoEstado.set(true);
    this.problema.set(null);
    this.aviso.set('');
    this.procesoService
      // Se reenvian los mismos datos del proceso; solo cambia el estado. La version sirve para detectar ediciones concurrentes
      .actualizar(p.id, { nombre: p.nombre, descripcion: p.descripcion, categoria: p.categoria, estado, version: p.version })
      .pipe(finalize(() => this.cambiandoEstado.set(false)))
      .subscribe({
        next: (actualizado) => {
          // Se reemplaza el proceso con la respuesta del servidor y se avisa al usuario
          this.proceso.set(actualizado);
          this.aviso.set(estado === 'PUBLICADO' ? 'El proceso quedó publicado.' : 'El proceso volvió a borrador.');
          // Subir el contador hace que el historial se recargue y muestre el cambio de estado
          this.recargaHistorial.update((n) => n + 1);
        },
        error: (err) => this.problema.set(problemaDe(err)),
      });
  }

  /** HU-06: elimina el proceso (queda inactivo) y vuelve al listado avisando cual se elimino. */
  eliminar(): void {
    const p = this.proceso();
    // Se cierra el modal de confirmacion en cualquier caso
    this.confirmandoEliminar.set(false);
    if (!p) {
      return;
    }
    this.procesoService.eliminar(p.id).subscribe({
      // El listado lee el query param "eliminado" para mostrar el mensaje de confirmacion
      next: () => this.router.navigate(['/procesos'], { queryParams: { eliminado: p.nombre } }),
      error: (err) => this.problema.set(problemaDe(err)),
    });
  }
}
