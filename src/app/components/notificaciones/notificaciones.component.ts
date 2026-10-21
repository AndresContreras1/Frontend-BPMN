import { Component, inject } from '@angular/core';

import { NotificacionesService } from '../../core/services/notificaciones.service';

/** Pinta los avisos del servicio compartido como toasts de Bootstrap en la esquina inferior. */
@Component({
  selector: 'app-notificaciones',
  templateUrl: './notificaciones.component.html',
})
export class NotificacionesComponent {
  /** Servicio compartido que guarda los avisos; el template lee sus avisos() y los cierra. */
  readonly notificaciones = inject(NotificacionesService);
}
