import { Component, computed, input, output } from '@angular/core';

import { Arco } from '../../../models/arco.model';
import { Advertencia } from '../../../models/diagrama.model';
import { Mensaje } from '../../../models/mensaje.model';
import { Nodo } from '../../../models/nodo.model';
import { Pool } from '../../../models/pool.model';
import { severidadesPor } from '../advertencias';
import { calcularLayout, Posicion, posicionEn, rutaArco, rutaMensaje } from '../layout';
import { ArcoSvgComponent } from '../arco-svg/arco-svg.component';
import { MensajeSvgComponent } from '../mensaje-svg/mensaje-svg.component';
import { NodoSvgComponent } from '../nodo-svg/nodo-svg.component';
import { PoolSvgComponent } from '../pool-svg/pool-svg.component';

/**
 * Lienzo SVG del diagrama. Recibe el diagrama por input(), calcula la geometría con funciones puras
 * (layout.ts) y avisa al padre de cada clic: en el fondo (con pool, lane y posición), en un
 * elemento, en un arco o en un mensaje. No hay arrastrar y soltar: la posición se elige con clic.
 * Es compartido: lo usan el editor y la ficha del proceso, que lo muestra en solo lectura (HU-07).
 */
@Component({
  selector: 'app-diagrama-svg',
  imports: [PoolSvgComponent, NodoSvgComponent, ArcoSvgComponent, MensajeSvgComponent],
  templateUrl: './diagrama-svg.component.html',
})
export class DiagramaSvgComponent {
  /** Pools del proceso (con sus lanes). */
  pools = input.required<Pool[]>();
  /** Actividades, gateways y eventos del proceso. */
  nodos = input.required<Nodo[]>();
  /** Flujos de secuencia entre nodos. */
  arcos = input<Arco[]>([]);
  /** Flujos de mensaje entre pools. */
  mensajes = input<Mensaje[]>([]);
  /** Advertencias del validador; sirven para pintar de rojo o amarillo lo que tiene problemas. */
  advertencias = input<Advertencia[]>([]);
  /** Id del nodo seleccionado en el editor (null si ninguno). */
  resaltado = input<number | null>(null);
  /** Id del arco seleccionado. */
  arcoResaltado = input<number | null>(null);
  /** Id del mensaje seleccionado. */
  mensajeResaltado = input<number | null>(null);
  /** Id del nodo desde el que se está creando una conexión (primer clic ya dado). */
  origenConexion = input<number | null>(null);
  /** Con una herramienta de colocar activa, el cursor indica que un clic agrega el elemento. */
  colocando = input<boolean>(false);

  /** Clic en un espacio vacío: lleva el pool, la lane y la posición donde cayó. */
  clicLienzo = output<Posicion>();
  /** Clic en un nodo: emite su id. */
  clicNodo = output<number>();
  /** Clic en un arco: emite su id. */
  clicArco = output<number>();
  /** Clic en un mensaje: emite su id. */
  clicMensaje = output<number>();

  /** Geometría completa del diagrama; se recalcula sola cuando cambian los pools o los nodos. */
  layout = computed(() => calcularLayout(this.pools(), this.nodos()));

  /** Los nodos con su posición ya calculada, como lista para recorrerla en el template. */
  nodosLayout = computed(() => [...this.layout().nodos.values()]);

  /** Para cada arco, el trazado entre su nodo origen y su nodo destino. */
  rutasArcos = computed(() => {
    // Se lee el layout una sola vez para buscar los nodos por id
    const layout = this.layout();
    // flatMap permite omitir (devolver []) los arcos cuyo origen o destino no existe
    return this.arcos().flatMap((arco) => {
      // Posición del nodo donde empieza el arco
      const origen = layout.nodos.get(arco.origenId);
      // Posición del nodo donde termina
      const destino = layout.nodos.get(arco.destinoId);
      // Si falta alguno de los dos no se dibuja el arco
      return origen && destino ? [{ arco, ruta: rutaArco(origen, destino) }] : [];
    });
  });

  /** Solo los mensajes que se envían dibujan el flujo; el catch es el extremo de llegada. */
  rutasMensajes = computed(() => {
    const layout = this.layout();
    return this.mensajes()
      // El mensaje de recepción no dibuja línea propia: la dibuja el de envío
      .filter((m) => m.direccion === 'ENVIO')
      .flatMap((mensaje) => {
        // Nodo que envía el mensaje
        const origen = layout.nodos.get(mensaje.nodo.id);
        // Nodo que lo recibe, si el mensaje apunta a uno
        const destino = mensaje.nodoDestinoId ? (layout.nodos.get(mensaje.nodoDestinoId) ?? null) : null;
        // Pool destino: sirve cuando no hay nodo receptor (caja negra o sistema externo)
        const poolDestino = layout.pools.find((p) => p.pool.id === mensaje.poolDestinoId) ?? null;
        // rutaMensaje devuelve null si no puede trazar la línea
        const ruta = origen ? rutaMensaje(origen, destino, poolDestino) : null;
        // Solo se incluyen los mensajes con ruta
        return ruta ? [{ mensaje, ruta }] : [];
      });
  });

  /** Mensaje asociado a cada nodo (id del nodo -> mensaje), para dibujar el sobre en los eventos. */
  mensajePorNodo = computed(() => new Map(this.mensajes().map((m) => [m.nodo.id, m])));

  // El validador apunta a pools, arcos o elementos según el código (ver advertencias.ts)
  /** Peor severidad por id de nodo (ERROR gana sobre AVISO). */
  severidadNodos = computed(() => severidadesPor(this.advertencias(), 'nodo'));
  /** Peor severidad por id de arco. */
  severidadArcos = computed(() => severidadesPor(this.advertencias(), 'arco'));
  /** Peor severidad por id de pool. */
  severidadPools = computed(() => severidadesPor(this.advertencias(), 'pool'));

  /** Clic en el fondo del lienzo: convierte las coordenadas del mouse en pool, lane y posición. */
  clicFondo(evento: MouseEvent): void {
    // El elemento SVG sobre el que se hizo clic
    const svg = evento.currentTarget as SVGSVGElement;
    // Su posición en la pantalla, para restarla a las coordenadas del mouse
    const caja = svg.getBoundingClientRect();
    // Coordenadas del clic relativas al lienzo (no a la ventana)
    const posicion = posicionEn(this.layout(), evento.clientX - caja.left, evento.clientY - caja.top);
    // Si el clic cayó fuera de todo pool, posicionEn devuelve null y no se emite nada
    if (posicion) {
      this.clicLienzo.emit(posicion);
    }
  }
}
