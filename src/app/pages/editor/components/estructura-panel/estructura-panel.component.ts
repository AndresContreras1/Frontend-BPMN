// input()/output(): la forma moderna de Angular para recibir datos del padre y avisarle de eventos.
import { Component, input, output } from '@angular/core';

// Modelos de lane y pool, y el tipo de selección del store.
import { Lane } from '../../../../models/lane.model';
import { Pool, TipoPool } from '../../../../models/pool.model';
import { Seleccion } from '../../editor.store';

/** Evento que se emite al subir o bajar una lane. */
export interface MovimientoLane {
  // Lane que se quiere mover.
  lane: Lane;
  // -1 sube una posición, 1 baja una posición.
  direccion: -1 | 1;
}

/**
 * Pools y lanes del proceso (HU-21, HU-22) con sus acciones. Solo muestra y avisa: la página
 * decide qué hacer con cada evento.
 */
@Component({
  // Etiqueta del componente.
  selector: 'app-estructura-panel',
  // Plantilla HTML.
  templateUrl: './estructura-panel.component.html',
})
export class EstructuraPanelComponent {
  /** Pools a mostrar (input.required: el padre siempre debe pasarlos). */
  pools = input.required<Pool[]>();
  /** Si es false se ocultan todos los botones de edición. */
  editable = input<boolean>(false);
  /** Lo que está abierto en el panel, para resaltar el pool o la lane correspondiente. */
  seleccion = input<Seleccion | null>(null);

  /** Pide al padre abrir un pool o una lane (id null = crear uno nuevo). */
  seleccionar = output<Seleccion>();
  /** Pide al padre subir o bajar una lane. */
  moverLane = output<MovimientoLane>();
  /** Pide al padre eliminar un pool (el padre muestra la confirmación). */
  eliminarPool = output<Pool>();
  /** Pide al padre eliminar una lane. */
  eliminarLane = output<Lane>();

  /** Texto que se muestra por cada tipo de pool. */
  readonly etiquetaTipo: Record<TipoPool, string> = {
    PROPIETARIO: 'Empresa propietaria',
    CLIENTE: 'Cliente',
    PROVEEDOR: 'Proveedor',
    SISTEMA_EXTERNO: 'Sistema externo',
  };

  /** Clase del icono de Bootstrap Icons por cada tipo de pool. */
  readonly iconoTipo: Record<TipoPool, string> = {
    PROPIETARIO: 'bi-building',
    CLIENTE: 'bi-person',
    PROVEEDOR: 'bi-truck',
    SISTEMA_EXTERNO: 'bi-hdd-network',
  };

  /** Lanes del pool ordenadas por su campo orden (se copia el arreglo con [...] para no alterar el original). */
  lanesOrdenadas(pool: Pool): Lane[] {
    return [...pool.lanes].sort((a, b) => a.orden - b.orden);
  }

  /** true si lo abierto en el panel es justo ese pool o esa lane (para resaltarlo). */
  estaSeleccionado(tipo: 'pool' | 'lane', id: number): boolean {
    const s = this.seleccion();
    return s?.tipo === tipo && s.id === id;
  }
}
