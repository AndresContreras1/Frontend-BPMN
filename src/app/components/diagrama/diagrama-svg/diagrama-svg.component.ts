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
  pools = input.required<Pool[]>();
  nodos = input.required<Nodo[]>();
  arcos = input<Arco[]>([]);
  mensajes = input<Mensaje[]>([]);
  advertencias = input<Advertencia[]>([]);
  resaltado = input<number | null>(null);
  arcoResaltado = input<number | null>(null);
  mensajeResaltado = input<number | null>(null);
  origenConexion = input<number | null>(null);
  /** Con una herramienta de colocar activa, el cursor indica que un clic agrega el elemento. */
  colocando = input<boolean>(false);

  clicLienzo = output<Posicion>();
  clicNodo = output<number>();
  clicArco = output<number>();
  clicMensaje = output<number>();

  layout = computed(() => calcularLayout(this.pools(), this.nodos()));

  nodosLayout = computed(() => [...this.layout().nodos.values()]);

  rutasArcos = computed(() => {
    const layout = this.layout();
    return this.arcos().flatMap((arco) => {
      const origen = layout.nodos.get(arco.origenId);
      const destino = layout.nodos.get(arco.destinoId);
      return origen && destino ? [{ arco, ruta: rutaArco(origen, destino) }] : [];
    });
  });

  /** Solo los mensajes que se envían dibujan el flujo; el catch es el extremo de llegada. */
  rutasMensajes = computed(() => {
    const layout = this.layout();
    return this.mensajes()
      .filter((m) => m.direccion === 'ENVIO')
      .flatMap((mensaje) => {
        const origen = layout.nodos.get(mensaje.nodo.id);
        const destino = mensaje.nodoDestinoId ? (layout.nodos.get(mensaje.nodoDestinoId) ?? null) : null;
        const poolDestino = layout.pools.find((p) => p.pool.id === mensaje.poolDestinoId) ?? null;
        const ruta = origen ? rutaMensaje(origen, destino, poolDestino) : null;
        return ruta ? [{ mensaje, ruta }] : [];
      });
  });

  mensajePorNodo = computed(() => new Map(this.mensajes().map((m) => [m.nodo.id, m])));

  // El validador apunta a pools, arcos o elementos según el código (ver advertencias.ts)
  severidadNodos = computed(() => severidadesPor(this.advertencias(), 'nodo'));
  severidadArcos = computed(() => severidadesPor(this.advertencias(), 'arco'));
  severidadPools = computed(() => severidadesPor(this.advertencias(), 'pool'));

  clicFondo(evento: MouseEvent): void {
    const svg = evento.currentTarget as SVGSVGElement;
    const caja = svg.getBoundingClientRect();
    const posicion = posicionEn(this.layout(), evento.clientX - caja.left, evento.clientY - caja.top);
    if (posicion) {
      this.clicLienzo.emit(posicion);
    }
  }
}
