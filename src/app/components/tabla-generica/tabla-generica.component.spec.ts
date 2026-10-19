import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Columna, TablaGenericaComponent } from './tabla-generica.component';

describe('TablaGenericaComponent', () => {
  let fixture: ComponentFixture<TablaGenericaComponent>;
  const columnas: Columna[] = [
    { clave: 'nombre', titulo: 'Nombre', ordenable: true },
    { clave: '', titulo: 'Acciones' },
  ];

  const crear = (orden: string, extra: Record<string, unknown> = {}) => {
    fixture = TestBed.createComponent(TablaGenericaComponent);
    fixture.componentRef.setInput('columnas', columnas);
    fixture.componentRef.setInput('orden', orden);
    for (const [clave, valor] of Object.entries(extra)) {
      fixture.componentRef.setInput(clave, valor);
    }
    fixture.detectChanges();
  };

  it('el primer clic ordena ascendente y el segundo invierte', () => {
    const emitidos: string[] = [];
    crear('creadoEn,desc');
    fixture.componentInstance.ordenar.subscribe((o) => emitidos.push(o));
    fixture.nativeElement.querySelector('thead button').click();

    crear('nombre,asc');
    fixture.componentInstance.ordenar.subscribe((o) => emitidos.push(o));
    fixture.nativeElement.querySelector('thead button').click();

    expect(emitidos).toEqual(['nombre,asc', 'nombre,desc']);
  });

  it('las columnas sin orden no son botones', () => {
    crear('nombre,asc');
    expect(fixture.nativeElement.querySelectorAll('thead button').length).toBe(1);
  });

  it('muestra el mensaje de lista vacía', () => {
    crear('nombre,asc', { vacia: true, mensajeVacio: 'Nada por aquí' });
    expect(fixture.nativeElement.textContent).toContain('Nada por aquí');
  });
});
