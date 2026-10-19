import { Component, input, output } from '@angular/core';

import { Arco } from '../../../models/arco.model';
import { Ruta } from '../layout';

/** HU-11: flujo de secuencia, línea continua con punta sólida y su etiqueta (Sí / No). */
@Component({
  selector: 'g[app-arco-svg]',
  templateUrl: './arco-svg.component.html',
})
export class ArcoSvgComponent {
  arco = input.required<Arco>();
  ruta = input.required<Ruta>();
  seleccionado = input<boolean>(false);
  conError = input<boolean>(false);

  elegir = output<void>();

  alClic(evento: MouseEvent): void {
    evento.stopPropagation();
    this.elegir.emit();
  }
}
