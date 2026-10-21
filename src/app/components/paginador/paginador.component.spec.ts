import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaginadorComponent } from './paginador.component';

describe('PaginadorComponent', () => {
  let fixture: ComponentFixture<PaginadorComponent>;

  const crear = (page: number, total: number) => {
    fixture = TestBed.createComponent(PaginadorComponent);
    fixture.componentRef.setInput('page', page);
    fixture.componentRef.setInput('totalPages', total);
    fixture.componentRef.setInput('totalElements', total * 10);
    fixture.detectChanges();
  };

  it('muestra como máximo cinco páginas alrededor de la actual', () => {
    crear(7, 20);
    expect(fixture.componentInstance.paginas()).toEqual([5, 6, 7, 8, 9]);
  });

  it('emite la página elegida', () => {
    crear(0, 3);
    const emitidas: number[] = [];
    fixture.componentInstance.pageChange.subscribe((p) => emitidas.push(p));

    const botones = fixture.nativeElement.querySelectorAll('button.page-link');
    (botones[2] as HTMLButtonElement).click();       // página 2
    (botones[0] as HTMLButtonElement).click();       // "Anterior" en la primera: no emite

    expect(emitidas).toEqual([1]);
  });

  it('con una sola página no muestra la navegación', () => {
    crear(0, 1);
    expect(fixture.nativeElement.querySelector('nav')).toBeNull();
  });
});
