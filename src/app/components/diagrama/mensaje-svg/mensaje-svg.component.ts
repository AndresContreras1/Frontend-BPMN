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
  mensaje = input.required<Mensaje>();
  ruta = input.required<Ruta>();
  seleccionado = input<boolean>(false);

  elegir = output<void>();

  alClic(evento: MouseEvent): void {
    evento.stopPropagation();
    this.elegir.emit();
  }
}
