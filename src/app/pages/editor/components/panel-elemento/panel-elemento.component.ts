// input()/output(): datos que llegan del padre y eventos que se le avisan.
import { Component, input, output } from '@angular/core';

/**
 * Marco del panel lateral para el elemento abierto: título, botón de cerrar y, para el
 * administrador, eliminar (la página pide antes el impacto). El formulario va con ng-content.
 */
@Component({
  // Etiqueta del componente.
  selector: 'app-panel-elemento',
  // Plantilla HTML.
  templateUrl: './panel-elemento.component.html',
})
export class PanelElementoComponent {
  /** Título del panel (input.required: el padre siempre lo pasa). */
  titulo = input.required<string>();
  /** Clase del icono de Bootstrap Icons que va junto al título. */
  icono = input<string>('bi-box');
  /** Historias de usuario del elemento abierto. */
  /** Historias de usuario del elemento abierto (opcional). */
  hu = input<string>();
  /** Si es true se muestra el botón Eliminar (solo el administrador). */
  puedeEliminar = input<boolean>(false);

  /** Avisa al padre que el usuario quiere eliminar el elemento. */
  eliminar = output<void>();
  /** Avisa al padre que el usuario cerró el panel. */
  cerrar = output<void>();
}
