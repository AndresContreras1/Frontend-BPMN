import { Component, input, output } from '@angular/core';

/** Definición de una columna de la tabla. */
export interface Columna {
  /** Propiedad por la que ordena la API (sort=clave,dir); vacía si la columna no ordena. */
  clave: string;
  /** Texto del encabezado. */
  titulo: string;
  /** Si es true, el encabezado se puede pulsar para ordenar. */
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
  /** Columnas que se dibujan en el encabezado. */
  columnas = input.required<Columna[]>();
  /** Orden actual, en el formato de la API: 'nombre,asc'. */
  orden = input<string>('');
  /** Si es true se muestra la fila "Cargando...". */
  cargando = input<boolean>(false);
  /** Si es true (y no está cargando) se muestra mensajeVacio. */
  vacia = input<boolean>(false);
  /** Texto que se ve cuando no hay filas. */
  mensajeVacio = input<string>('No hay resultados.');
  /** Se emite con el nuevo orden ("clave,asc" o "clave,desc") para que el padre vuelva a pedir los datos. */
  ordenar = output<string>();

  /** Campo por el que se ordena ahora: lo que va antes de la coma. */
  campoOrden(): string {
    return this.orden().split(',')[0];
  }

  /** Dirección actual (asc o desc): lo que va después de la coma; asc si no hay. */
  direccion(): string {
    return this.orden().split(',')[1] ?? 'asc';
  }

  /** Clic en un encabezado: primero ascendente; otro clic invierte. */
  alternar(columna: Columna): void {
    // Por seguridad: una columna no ordenable no emite nada
    if (!columna.ordenable) {
      return;
    }
    // Si ya ordena por esta columna en ascendente, ahora va descendente; en cualquier otro caso, ascendente
    const dir = this.campoOrden() === columna.clave && this.direccion() === 'asc' ? 'desc' : 'asc';
    this.ordenar.emit(`${columna.clave},${dir}`);
  }
}
