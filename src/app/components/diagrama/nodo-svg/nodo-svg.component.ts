import { Component, computed, input, output } from '@angular/core';

import { Severidad } from '../../../models/diagrama.model';
import { Mensaje } from '../../../models/mensaje.model';
import { TipoActividad } from '../../../models/nodo.model';
import { NodoLayout, partirTexto } from '../layout';

/** Glifos de Bootstrap Icons (la fuente ya está cargada en la app). */
const ICONO_ACTIVIDAD: Record<TipoActividad, string> = {
  TAREA: '',
  USUARIO: '',      // person-fill
  MANUAL: '',       // hand-index-thumb
  SERVICIO: '',     // gear-fill
  ENVIO: '',        // envelope-fill
  RECEPCION: '',    // envelope
};
const SOBRE_LLENO = '';
const SOBRE_VACIO = '';

/**
 * Un elemento del flujo con su símbolo BPMN: actividad (rectángulo redondeado con el ícono de su
 * tipo), gateway (rombo con X, + u O) y evento (círculo delgado de inicio, grueso de fin, doble si
 * es intermedio; con sobre lleno si envía y vacío si recibe).
 */
@Component({
  selector: 'g[app-nodo-svg]',
  templateUrl: './nodo-svg.component.html',
})
export class NodoSvgComponent {
  layout = input.required<NodoLayout>();
  mensaje = input<Mensaje | null>(null);
  seleccionado = input<boolean>(false);
  severidad = input<Severidad | null>(null);
  /** Primer extremo de una conexión en curso. */
  origen = input<boolean>(false);

  elegir = output<void>();

  /** inicio, fin o intermedio, para el borde del círculo. */
  tipoEvento = computed(() => {
    const nodo = this.layout().nodo;
    if (nodo.tipo === 'EVENTO_INICIO' || nodo.variante === 'INICIO') {
      return 'inicio';
    }
    if (nodo.tipo === 'EVENTO_FIN' || nodo.variante === 'FIN') {
      return 'fin';
    }
    return 'intermedio';
  });

  icono = computed(() => {
    const tipo = this.layout().nodo.tipoActividad;
    return tipo ? ICONO_ACTIVIDAD[tipo] : '';
  });

  sobre = computed(() => {
    const mensaje = this.mensaje();
    if (!mensaje || this.layout().forma !== 'evento') {
      return '';
    }
    return mensaje.direccion === 'ENVIO' ? SOBRE_LLENO : SOBRE_VACIO;
  });

  lineas = computed(() => partirTexto(this.layout().nodo.nombre, this.layout().forma === 'actividad' ? 16 : 20, this.layout().forma === 'actividad' ? 3 : 2));

  /** Primer renglón para que el texto quede centrado en la actividad. */
  inicioTexto = computed(() => 4 - (this.lineas().length - 1) * 6.5);

  titulo = computed(() => {
    const nodo = this.layout().nodo;
    const mensaje = this.mensaje();
    const nombre = nodo.nombre ?? '';
    if (mensaje) {
      return `${mensaje.direccion === 'ENVIO' ? 'Envía' : 'Recibe'} el mensaje "${mensaje.nombre}"`;
    }
    switch (nodo.tipo) {
      case 'ACTIVIDAD':
        return `Actividad ${nombre} (${nodo.tipoActividad})`;
      case 'GATEWAY':
        return `Gateway ${nodo.tipoGateway} ${nombre}`;
      case 'EVENTO_INICIO':
        return `Inicio ${nombre}`;
      default:
        return `Fin ${nombre}`;
    }
  });

  alClic(evento: MouseEvent): void {
    // Que el clic no llegue al lienzo (allí colocaría un elemento nuevo)
    evento.stopPropagation();
    this.elegir.emit();
  }
}
