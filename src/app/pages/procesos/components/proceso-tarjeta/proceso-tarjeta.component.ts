import { DatePipe } from '@angular/common';
import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { EstadoBadgeComponent } from '../../../../components/estado-badge/estado-badge.component';
import { Proceso } from '../../../../models/proceso.model';

/**
 * Un proceso como tarjeta (vista de tarjetas de HU-07). Solo muestra y avisa: la página decide los permisos
 * (input) y qué hacer al eliminar (output), igual que con la tabla.
 */
@Component({
  selector: 'app-proceso-tarjeta',
  imports: [DatePipe, RouterLink, EstadoBadgeComponent],
  templateUrl: './proceso-tarjeta.component.html',
  styleUrl: './proceso-tarjeta.component.scss',
})
export class ProcesoTarjetaComponent {
  proceso = input.required<Proceso>();
  puedeEditar = input(false);
  puedeEliminar = input(false);
  eliminar = output<Proceso>();
}
