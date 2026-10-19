import { Component, input, output } from '@angular/core';

/**
 * Marco del panel lateral para el elemento abierto: título, botón de cerrar y, para el
 * administrador, eliminar (la página pide antes el impacto). El formulario va con ng-content.
 */
@Component({
  selector: 'app-panel-elemento',
  templateUrl: './panel-elemento.component.html',
})
export class PanelElementoComponent {
  titulo = input.required<string>();
  icono = input<string>('bi-box');
  /** Historias de usuario del elemento abierto. */
  hu = input<string>();
  puedeEliminar = input<boolean>(false);

  eliminar = output<void>();
  cerrar = output<void>();
}
