import { Component, input } from '@angular/core';

import { Severidad } from '../../../../models/diagrama.model';
import { ANCHO_ETIQUETA_LANE, ANCHO_ETIQUETA_POOL, PoolLayout } from '../../layout';

/** HU-21 y HU-22: un pool con su nombre vertical y sus lanes; la caja negra solo muestra el nombre. */
@Component({
  selector: 'g[app-pool-svg]',
  templateUrl: './pool-svg.component.html',
})
export class PoolSvgComponent {
  layout = input.required<PoolLayout>();
  /** Advertencia del pool completo (sin inicio, sin fin, caja negra con elementos). */
  severidad = input<Severidad | null>(null);

  readonly anchoEtiquetaPool = ANCHO_ETIQUETA_POOL;
  readonly anchoEtiquetaLane = ANCHO_ETIQUETA_LANE;

  /** Gira el texto -90° alrededor de su centro. */
  rotar(x: number, y: number): string {
    return `rotate(-90 ${x} ${y})`;
  }
}
