import { Component, computed, input, output } from '@angular/core';

import { Severidad } from '../../../models/diagrama.model';
import { Mensaje } from '../../../models/mensaje.model';
import { TipoActividad } from '../../../models/nodo.model';
import { NodoLayout, partirTexto } from '../layout';

/** Glifos de Bootstrap Icons (la fuente ya está cargada en la app). */
// Ícono de cada tipo de actividad; la TAREA genérica no lleva ícono
const ICONO_ACTIVIDAD: Record<TipoActividad, string> = {
  TAREA: '',
  USUARIO: '',      // person-fill
  MANUAL: '',       // hand-index-thumb
  SERVICIO: '',     // gear-fill
  ENVIO: '',        // envelope-fill
  RECEPCION: '',    // envelope
};
// Glifo del sobre cerrado, para eventos que envían
const SOBRE_LLENO = '';
// Glifo del sobre abierto, para eventos que reciben
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
  /** Posición y forma del nodo ya calculadas en layout.ts. */
  layout = input.required<NodoLayout>();
  /** Mensaje asociado al nodo (si es un evento o actividad de envío/recepción). */
  mensaje = input<Mensaje | null>(null);
  /** Si el usuario lo eligió en el editor. */
  seleccionado = input<boolean>(false);
  /** Peor severidad de las advertencias de este nodo (ERROR o AVISO), o null si no tiene. */
  severidad = input<Severidad | null>(null);
  /** Primer extremo de una conexión en curso. */
  origen = input<boolean>(false);

  /** Se emite cuando el usuario hace clic en el nodo. */
  elegir = output<void>();

  /** inicio, fin o intermedio, para el borde del círculo. */
  tipoEvento = computed(() => {
    // Nodo del que sale la información
    const nodo = this.layout().nodo;
    // Por el tipo o por la variante (el backend puede mandar cualquiera de las dos)
    if (nodo.tipo === 'EVENTO_INICIO' || nodo.variante === 'INICIO') {
      return 'inicio';
    }
    // Igual para el fin
    if (nodo.tipo === 'EVENTO_FIN' || nodo.variante === 'FIN') {
      return 'fin';
    }
    // Si no es inicio ni fin, es intermedio
    return 'intermedio';
  });

  /** Glifo del ícono de la actividad, o texto vacío si no aplica. */
  icono = computed(() => {
    // Tipo de actividad (tarea, usuario, servicio...) si el nodo es una actividad
    const tipo = this.layout().nodo.tipoActividad;
    return tipo ? ICONO_ACTIVIDAD[tipo] : '';
  });

  /** Glifo del sobre para eventos con mensaje: lleno si envía, vacío si recibe. */
  sobre = computed(() => {
    // El sobre solo se dibuja en eventos que tengan mensaje
    const mensaje = this.mensaje();
    if (!mensaje || this.layout().forma !== 'evento') {
      return '';
    }
    // ENVIO -> sobre lleno; RECEPCION -> sobre vacío
    return mensaje.direccion === 'ENVIO' ? SOBRE_LLENO : SOBRE_VACIO;
  });

  /** Nombre del nodo partido en renglones: hasta 16 letras por renglón y 3 renglones en actividades; 20 letras y 2 renglones en las demás formas. */
  lineas = computed(() => partirTexto(this.layout().nodo.nombre, this.layout().forma === 'actividad' ? 16 : 20, this.layout().forma === 'actividad' ? 3 : 2));

  /** Primer renglón para que el texto quede centrado en la actividad. */
  inicioTexto = computed(() => 4 - (this.lineas().length - 1) * 6.5);

  /** Texto del tooltip: describe el nodo (o su mensaje) en una frase. */
  titulo = computed(() => {
    const nodo = this.layout().nodo;
    const mensaje = this.mensaje();
    // El nombre puede ser null; usamos texto vacío en ese caso
    const nombre = nodo.nombre ?? '';
    // Si el nodo tiene mensaje, el tooltip habla del mensaje
    if (mensaje) {
      return `${mensaje.direccion === 'ENVIO' ? 'Envía' : 'Recibe'} el mensaje "${mensaje.nombre}"`;
    }
    // Si no, depende del tipo de nodo
    switch (nodo.tipo) {
      case 'ACTIVIDAD':
        return `Actividad ${nombre} (${nodo.tipoActividad})`;
      case 'GATEWAY':
        return `Gateway ${nodo.tipoGateway} ${nombre}`;
      case 'EVENTO_INICIO':
        return `Inicio ${nombre}`;
      // Lo único que queda es el evento de fin (EVENTO_FIN)
      default:
        return `Fin ${nombre}`;
    }
  });

  /** Clic en el nodo: avisa al padre que lo eligieron. */
  alClic(evento: MouseEvent): void {
    // Que el clic no llegue al lienzo (allí colocaría un elemento nuevo)
    evento.stopPropagation();
    this.elegir.emit();
  }
}
