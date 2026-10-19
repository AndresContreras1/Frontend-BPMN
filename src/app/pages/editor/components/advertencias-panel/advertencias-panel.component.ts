import { Component, computed, input, output } from '@angular/core';

import { Advertencia } from '../../../../models/diagrama.model';
import { tipoDeElemento } from '../../advertencias';

/**
 * Resultado del validador del proceso. Los ERROR impiden publicar; los AVISO solo informan.
 * Clic en una advertencia: el padre resalta el elemento en el lienzo.
 */
@Component({
  selector: 'app-advertencias-panel',
  templateUrl: './advertencias-panel.component.html',
})
export class AdvertenciasPanelComponent {
  advertencias = input<Advertencia[]>([]);
  validando = input<boolean>(false);

  elegir = output<Advertencia>();
  validar = output<void>();

  errores = computed(() => this.advertencias().filter((a) => a.severidad === 'ERROR'));
  avisos = computed(() => this.advertencias().filter((a) => a.severidad === 'AVISO'));

  /** Solo se puede ir a elementos y arcos (los avisos de pool o de diagrama no tienen a dónde ir). */
  seUbica(advertencia: Advertencia): boolean {
    const tipo = tipoDeElemento(advertencia);
    return tipo === 'nodo' || tipo === 'arco';
  }
}
