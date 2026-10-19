import { Component, input, output } from '@angular/core';

import { Lane } from '../../../../models/lane.model';
import { Pool, TipoPool } from '../../../../models/pool.model';
import { Seleccion } from '../../editor.store';

export interface MovimientoLane {
  lane: Lane;
  direccion: -1 | 1;
}

/**
 * Pools y lanes del proceso (HU-21, HU-22) con sus acciones. Solo muestra y avisa: la página
 * decide qué hacer con cada evento.
 */
@Component({
  selector: 'app-estructura-panel',
  templateUrl: './estructura-panel.component.html',
})
export class EstructuraPanelComponent {
  pools = input.required<Pool[]>();
  editable = input<boolean>(false);
  seleccion = input<Seleccion | null>(null);

  seleccionar = output<Seleccion>();
  moverLane = output<MovimientoLane>();
  eliminarPool = output<Pool>();
  eliminarLane = output<Lane>();

  readonly etiquetaTipo: Record<TipoPool, string> = {
    PROPIETARIO: 'Empresa propietaria',
    CLIENTE: 'Cliente',
    PROVEEDOR: 'Proveedor',
    SISTEMA_EXTERNO: 'Sistema externo',
  };

  readonly iconoTipo: Record<TipoPool, string> = {
    PROPIETARIO: 'bi-building',
    CLIENTE: 'bi-person',
    PROVEEDOR: 'bi-truck',
    SISTEMA_EXTERNO: 'bi-hdd-network',
  };

  lanesOrdenadas(pool: Pool): Lane[] {
    return [...pool.lanes].sort((a, b) => a.orden - b.orden);
  }

  estaSeleccionado(tipo: 'pool' | 'lane', id: number): boolean {
    const s = this.seleccion();
    return s?.tipo === tipo && s.id === id;
  }
}
