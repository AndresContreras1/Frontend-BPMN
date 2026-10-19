import { Component, input, output } from '@angular/core';

export interface Columna {
  /** Propiedad por la que ordena la API (sort=clave,dir); vacía si la columna no ordena. */
  clave: string;
  titulo: string;
  ordenable?: boolean;
  /** Clases extra del encabezado, por ejemplo 'text-end'. */
  clase?: string;
}

/**
 * Tabla reutilizable: dibuja los encabezados, permite ordenar por columna y muestra los estados
 * de carga y de lista vacía. Las filas (<tr>) las pone el padre con ng-content.
 */
@Component({
  selector: 'app-tabla-generica',
  templateUrl: './tabla-generica.component.html',
})
export class TablaGenericaComponent {
  columnas = input.required<Columna[]>();
  /** Orden actual, en el formato de la API: 'nombre,asc'. */
  orden = input<string>('');
  cargando = input<boolean>(false);
  vacia = input<boolean>(false);
  mensajeVacio = input<string>('No hay resultados.');
  ordenar = output<string>();

  campoOrden(): string {
    return this.orden().split(',')[0];
  }

  direccion(): string {
    return this.orden().split(',')[1] ?? 'asc';
  }

  /** Clic en un encabezado: primero ascendente; otro clic invierte. */
  alternar(columna: Columna): void {
    if (!columna.ordenable) {
      return;
    }
    const dir = this.campoOrden() === columna.clave && this.direccion() === 'asc' ? 'desc' : 'asc';
    this.ordenar.emit(`${columna.clave},${dir}`);
  }
}
