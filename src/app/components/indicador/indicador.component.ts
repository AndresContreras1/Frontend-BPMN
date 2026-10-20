import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export type ColorIndicador = 'primary' | 'success' | 'warning' | 'info' | 'secondary' | 'danger';

/**
 * Tarjeta con un número del inicio (procesos, borradores, compartidos...). Es presentacional: el padre
 * le pasa todo por input() y la reutiliza con datos distintos; si recibe una ruta, la tarjeta entera es un enlace.
 */
@Component({
  selector: 'app-indicador',
  imports: [RouterLink],
  templateUrl: './indicador.component.html',
})
export class IndicadorComponent {
  clave = input.required<string>();
  titulo = input.required<string>();
  valor = input.required<number | string>();
  icono = input('bi-bar-chart');
  color = input<ColorIndicador>('primary');
  descripcion = input<string>();
  ruta = input<string>();
  parametros = input<Record<string, string>>({});
}
