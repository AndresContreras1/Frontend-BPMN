import { Component, input, output } from '@angular/core';

import { Mensaje } from '../../../models/mensaje.model';
import { Ruta } from '../layout';

/**
 * HU-25 a HU-28: flujo de mensaje entre pools, línea punteada con círculo de origen y punta hueca;
 * muestra el nombre del mensaje y su clave de correlación.
 */
@Component({
  selector: 'g[app-mensaje-svg]',
  templateUrl: './mensaje-svg.component.html',
})
export class MensajeSvgComponent {
  /** Datos del mensaje (nombre, clave de correlación, nodo origen). */
  mensaje = input.required<Mensaje>();
  /** Trazado ya calculado en layout.ts (path y posición de la etiqueta). */
  ruta = input.required<Ruta>();
  /** Si el usuario lo eligió en el editor (se resalta). */
  seleccionado = input<boolean>(false);

  /** Se emite cuando el usuario hace clic en el mensaje. */
  elegir = output<void>();

  /** Clic en el mensaje: avisa al padre que lo eligieron. */
  alClic(evento: MouseEvent): void {
    // Evita que el clic llegue al lienzo (allí agregaría un elemento nuevo)
    evento.stopPropagation();
    this.elegir.emit();
  }
}
