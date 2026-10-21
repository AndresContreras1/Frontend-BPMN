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
  /** Si el modal está visible; lo controla el padre. */
  abierto = input.required<boolean>();
  /** Título del modal. */
  titulo = input<string>('Confirmar');
  /** Pregunta o explicación que ve el usuario. */
  mensaje = input<string>('¿Desea continuar?');
  /** Consecuencias de la eliminación que calculó el backend (por ejemplo, elementos que quedan sin conexión). */
  advertencias = input<Advertencia[]>([]);
  /** Texto del botón que confirma la acción. */
  textoConfirmar = input<string>('Eliminar');
  /** Se emite cuando el usuario acepta; el padre es quien hace la eliminación. */
  confirmar = output<void>();
  /** Se emite cuando el usuario cierra o cancela el modal. */
  cancelar = output<void>();
}
