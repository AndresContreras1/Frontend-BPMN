import { Component, computed, input, output } from '@angular/core';

/** Paginador reutilizable: recibe la página actual y el total, y avisa al padre a qué página ir. */
@Component({
  selector: 'app-paginador',
  templateUrl: './paginador.component.html',
})
export class PaginadorComponent {
  page = input.required<number>();
  totalPages = input.required<number>();
  totalElements = input<number>(0);
  pageChange = output<number>();

  /** Hasta cinco números alrededor de la página actual. */
  paginas = computed(() => {
    const total = this.totalPages();
    const inicio = Math.max(0, Math.min(this.page() - 2, total - 5));
    return Array.from({ length: Math.min(5, total) }, (_, i) => inicio + i);
  });

  ir(numero: number): void {
    if (numero >= 0 && numero < this.totalPages() && numero !== this.page()) {
      this.pageChange.emit(numero);
    }
  }
}
