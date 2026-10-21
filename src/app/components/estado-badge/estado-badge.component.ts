import { Component, input } from '@angular/core';

import { EstadoProceso } from '../../models/proceso.model';

/** Estado del proceso: borrador (puede estar incompleto) o publicado (coherente). */
@Component({
  selector: 'app-estado-badge',
  templateUrl: './estado-badge.component.html',
})
export class EstadoBadgeComponent {
  estado = input.required<EstadoProceso>();
  activo = input<boolean>(true);
}
