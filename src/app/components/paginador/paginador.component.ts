import { Component, computed, input, output } from '@angular/core';

/** Paginador reutilizable: recibe la página actual y el total, y avisa al padre a qué página ir. */
@Component({
  selector: 'app-paginador',
  templateUrl: './paginador.component.html',
})
export class PaginadorComponent {
  pagina = input.required<number>();
  totalPaginas = input.required<number>();
  totalElementos = input<number>(0);
  cambio = output<number>();

  /** Hasta cinco números alrededor de la página actual. */
  paginas = computed(() => {
    const total = this.totalPaginas();
    const inicio = Math.max(0, Math.min(this.pagina() - 2, total - 5));
    return Array.from({ length: Math.min(5, total) }, (_, i) => inicio + i);
  });

  ir(numero: number): void {
    if (numero >= 0 && numero < this.totalPaginas() && numero !== this.pagina()) {
      this.cambio.emit(numero);
    }
  }
}
