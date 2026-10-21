import { Component, input } from '@angular/core';

import { EstadoProceso } from '../../models/proceso.model';

/** Estado del proceso: borrador (puede estar incompleto) o publicado (coherente). */
@Component({
  selector: 'app-estado-badge',
  templateUrl: './estado-badge.component.html',
})
export class EstadoBadgeComponent {
  /** Estado del proceso: BORRADOR o PUBLICADO. */
  estado = input.required<EstadoProceso>();
  /** Si es false el proceso fue eliminado (borrado lógico) y se muestra como "Eliminado". */
  activo = input<boolean>(true);
}
