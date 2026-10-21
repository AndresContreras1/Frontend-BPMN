// computed: valor derivado que se recalcula cuando cambian los inputs.
import { Component, computed, input, output } from '@angular/core';

// Modelo de advertencia y función que dice a qué tipo de elemento apunta (nodo, arco, etc.).
import { Advertencia } from '../../../../models/diagrama.model';
import { tipoDeElemento } from '../../../../components/diagrama/advertencias';

/**
 * Resultado del validador del proceso. Los ERROR impiden publicar; los AVISO solo informan.
 * Clic en una advertencia: el padre resalta el elemento en el lienzo.
 */
@Component({
  // Etiqueta del componente.
  selector: 'app-advertencias-panel',
  // Plantilla HTML.
  templateUrl: './advertencias-panel.component.html',
})
export class AdvertenciasPanelComponent {
  /** Lista de advertencias que entrega el padre. */
  advertencias = input<Advertencia[]>([]);
  /** true mientras se ejecuta la validación (deshabilita el botón Validar). */
  validando = input<boolean>(false);

  /** Avisa al padre qué advertencia eligió el usuario para ir a su elemento. */
  elegir = output<Advertencia>();
  /** Pide al padre ejecutar el validador. */
  validar = output<void>();

  /** Solo las advertencias de severidad ERROR. */
  errores = computed(() => this.advertencias().filter((a) => a.severidad === 'ERROR'));
  /** Solo las de severidad AVISO. */
  avisos = computed(() => this.advertencias().filter((a) => a.severidad === 'AVISO'));

  /** Solo se puede ir a elementos y arcos (los avisos de pool o de diagrama no tienen a dónde ir). */
  seUbica(advertencia: Advertencia): boolean {
    const tipo = tipoDeElemento(advertencia);
    return tipo === 'nodo' || tipo === 'arco';
  }
}
