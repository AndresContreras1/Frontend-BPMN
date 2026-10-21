import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaginadorComponent } from './paginador.component';

/** Pruebas del paginador reutilizable (botones de página, anterior y siguiente). */
describe('PaginadorComponent', () => {
  let fixture: ComponentFixture<PaginadorComponent>;

  // Ayuda: crea el paginador con la página actual y el total de páginas.
  // Con setInput se simulan los valores que enviaría el componente padre.
  const crear = (page: number, total: number) => {
    fixture = TestBed.createComponent(PaginadorComponent);
    fixture.componentRef.setInput('page', page);
    fixture.componentRef.setInput('totalPages', total);
    fixture.componentRef.setInput('totalElements', total * 10);
    fixture.detectChanges();
  };

  // Escenario: 20 páginas y se está en la 7.
  // Esperado: la lista visible son 5 páginas centradas en la actual.
  it('muestra como máximo cinco páginas alrededor de la actual', () => {
    crear(7, 20);
    expect(fixture.componentInstance.paginas()).toEqual([5, 6, 7, 8, 9]);
  });

  // Escenario: se pulsan dos botones, uno válido y uno deshabilitado.
  // Esperado: solo el válido emite el número de página.
  it('emite la página elegida', () => {
    crear(0, 3);
    const emitidas: number[] = [];
    // Nos suscribimos al output para guardar cada página emitida
    fixture.componentInstance.pageChange.subscribe((p) => emitidas.push(p));

    const botones = fixture.nativeElement.querySelectorAll('button.page-link');
    (botones[2] as HTMLButtonElement).click();       // página 2
    (botones[0] as HTMLButtonElement).click();       // "Anterior" en la primera: no emite

    expect(emitidas).toEqual([1]);
  });

  // Escenario: solo hay una página.
  // Esperado: no se dibuja la navegación.
  it('con una sola página no muestra la navegación', () => {
    crear(0, 1);
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
  });
});
