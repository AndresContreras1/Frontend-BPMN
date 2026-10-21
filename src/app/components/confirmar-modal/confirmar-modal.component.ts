import { Component, input, output } from '@angular/core';

import { Advertencia } from '../../models/diagrama.model';

/**
 * Confirmación antes de eliminar (HU-06, HU-10, HU-13, HU-16, HU-19): modal de Bootstrap
 * controlado por Angular, que muestra las advertencias que dejaría la eliminación.
 */
@Component({
  selector: 'app-confirmar-modal',
  templateUrl: './confirmar-modal.component.html',
})
export class ConfirmarModalComponent {
  abierto = input.required<boolean>();
  titulo = input<string>('Confirmar');
  mensaje = input<string>('¿Desea continuar?');
  advertencias = input<Advertencia[]>([]);
  textoConfirmar = input<string>('Eliminar');
  confirmar = output<void>();
  cancelar = output<void>();
}
