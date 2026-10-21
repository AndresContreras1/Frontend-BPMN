import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Colores de Bootstrap que se pueden usar en la tarjeta. */
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
  /** Identificador corto del indicador; se usa para armar el id del HTML. */
  clave = input.required<string>();
  /** Nombre del indicador (por ejemplo "Procesos"). */
  titulo = input.required<string>();
  /** Número (o texto) grande que se muestra. */
  valor = input.required<number | string>();
  /** Clase del ícono de Bootstrap Icons. */
  icono = input('bi-bar-chart');
  /** Color de la tarjeta. */
  color = input<ColorIndicador>('primary');
  /** Texto pequeño opcional debajo del valor. */
  descripcion = input<string>();
  /** Ruta a la que lleva la tarjeta; si no hay, la tarjeta no es un enlace. */
  ruta = input<string>();
  /** Query params que se agregan a la ruta (por ejemplo un filtro). */
  parametros = input<Record<string, string>>({});
}
