import { Component, computed, input, output } from '@angular/core';

import { Herramienta } from '../../editor.store';

interface OpcionHerramienta {
  valor: Herramienta;
  icono: string;
  texto: string;
}

/** Paleta del editor: qué hace el próximo clic en el lienzo. */
@Component({
  selector: 'app-herramientas-barra',
  templateUrl: './herramientas-barra.component.html',
})
export class HerramientasBarraComponent {
  herramienta = input.required<Herramienta>();
  /** Hay un elemento elegido como origen de una conexión. */
  conectando = input<boolean>(false);
  cambiar = output<Herramienta>();

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
      case 'ACTIVIDAD':
      case 'GATEWAY':
        return 'Haga clic dentro de una lane: la lane define el responsable.';
      default:
        return 'Haga clic en el lienzo, dentro del pool donde va el elemento.';
    }
  });
}
