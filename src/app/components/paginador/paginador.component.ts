import { Component, computed, input, output } from '@angular/core';

/** Paginador reutilizable: recibe la página actual y el total, y avisa al padre a qué página ir. */
@Component({
  selector: 'app-paginador',
  templateUrl: './paginador.component.html',
})
export class PaginadorComponent {
  /** Página actual, empezando en 0 (como lo maneja la API). */
  page = input.required<number>();
  /** Cantidad total de páginas. */
  totalPages = input.required<number>();
  /** Cantidad total de resultados, para mostrar el conteo. */
  totalElements = input<number>(0);
  /** Se emite con el número de la página a la que el usuario quiere ir. */
  pageChange = output<number>();

  /** Hasta cinco números alrededor de la página actual. */
  paginas = computed(() => {
    // Total de páginas
    const total = this.totalPages();
    // Primera página de la ventana: dos antes de la actual, sin pasarse de 0 ni dejar menos de 5 al final
    const inicio = Math.max(0, Math.min(this.page() - 2, total - 5));
    // Arreglo de hasta 5 números consecutivos desde inicio
    return Array.from({ length: Math.min(5, total) }, (_, i) => inicio + i);
  });

  /** Pide cambiar de página, solo si el destino existe y no es la página actual. */
  ir(numero: number): void {
    if (numero >= 0 && numero < this.totalPages() && numero !== this.page()) {
      this.pageChange.emit(numero);
    }
  }
}
