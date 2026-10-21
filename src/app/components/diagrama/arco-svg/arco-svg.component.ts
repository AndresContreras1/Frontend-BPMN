import { Component, input, output } from '@angular/core';

import { Arco } from '../../../models/arco.model';
import { Ruta } from '../layout';

/** HU-11: flujo de secuencia, línea continua con punta sólida y su etiqueta (Sí / No). */
@Component({
  selector: 'g[app-arco-svg]',
  templateUrl: './arco-svg.component.html',
})
export class ArcoSvgComponent {
  /** Datos del arco (id, origen, destino, condición, etiqueta). */
  arco = input.required<Arco>();
  /** Trazado ya calculado en layout.ts: el path SVG y dónde poner la etiqueta. */
  ruta = input.required<Ruta>();
  /** Si el usuario lo eligió en el editor (se resalta). */
  seleccionado = input<boolean>(false);
  /** Si el validador reportó un ERROR sobre este arco (se pinta de rojo). */
  conError = input<boolean>(false);

  /** Se emite cuando el usuario hace clic sobre el arco. */
  elegir = output<void>();

  /** Clic en el arco: avisa al padre que lo eligieron. */
  alClic(evento: MouseEvent): void {
    // Evita que el clic llegue al lienzo (allí agregaría un elemento nuevo)
    evento.stopPropagation();
    this.elegir.emit();
  }
}
