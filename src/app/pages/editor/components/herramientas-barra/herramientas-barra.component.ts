// computed: la ayuda se recalcula sola cuando cambia la herramienta.
import { Component, computed, input, output } from '@angular/core';

// Tipo con los nombres de las herramientas.
import { Herramienta } from '../../editor.store';

/** Una herramienta de la barra: su valor, el icono y el texto del botón. */
interface OpcionHerramienta {
  // Nombre interno de la herramienta.
  valor: Herramienta;
  // Clase del icono de Bootstrap Icons.
  icono: string;
  // Texto visible y tooltip del botón.
  texto: string;
}

/** Paleta del editor: qué hace el próximo clic en el lienzo. */
@Component({
  // Etiqueta del componente.
  selector: 'app-herramientas-barra',
  // Plantilla HTML.
  templateUrl: './herramientas-barra.component.html',
})
export class HerramientasBarraComponent {
  /** Herramienta activa (la resalta el botón correspondiente). */
  herramienta = input.required<Herramienta>();
  /** Hay un elemento elegido como origen de una conexión. */
  conectando = input<boolean>(false);
  /** Avisa al padre qué herramienta eligió el usuario. */
  cambiar = output<Herramienta>();

  /** Botones agrupados: selección y movimiento / elementos del flujo y conectar / mensajes. Cada grupo es una fila de botones. */
  readonly grupos: OpcionHerramienta[][] = [
    [
      { valor: 'seleccionar', icono: 'bi-cursor', texto: 'Seleccionar' },
      { valor: 'mover', icono: 'bi-arrows-move', texto: 'Mover' },
    ],
    [
      { valor: 'INICIO', icono: 'bi-circle', texto: 'Inicio' },
      { valor: 'ACTIVIDAD', icono: 'bi-square', texto: 'Actividad' },
      { valor: 'GATEWAY', icono: 'bi-diamond', texto: 'Gateway' },
      { valor: 'FIN', icono: 'bi-record-circle', texto: 'Fin' },
      { valor: 'conectar', icono: 'bi-arrow-right', texto: 'Conectar' },
    ],
    [
      { valor: 'THROW', icono: 'bi-envelope-fill', texto: 'Enviar mensaje' },
      { valor: 'CATCH', icono: 'bi-envelope', texto: 'Recibir mensaje' },
      { valor: 'EXTERNO', icono: 'bi-send', texto: 'Notificación externa' },
    ],
  ];

  /** Texto de ayuda según la herramienta activa. En conectar cambia según se haya elegido ya el origen o no. */
  ayuda = computed(() => {
    switch (this.herramienta()) {
      case 'seleccionar':
        return 'Haga clic en un elemento, arco o mensaje para verlo o editarlo.';
      case 'mover':
        return 'Seleccione un elemento y luego haga clic donde debe quedar (dentro de su pool).';
      case 'conectar':
        return this.conectando()
          ? 'Ahora haga clic en el elemento de destino.'
          : 'Haga clic en el elemento de origen del flujo de secuencia.';
      // Actividad y gateway comparten mensaje porque ambos deben ir dentro de una lane.
      case 'ACTIVIDAD':
      case 'GATEWAY':
        return 'Haga clic dentro de una lane: la lane define el responsable.';
      // Para el resto de elementos (inicio, fin, mensajes).
      default:
        return 'Haga clic en el lienzo, dentro del pool donde va el elemento.';
    }
  });
}
