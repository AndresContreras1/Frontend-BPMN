import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Columna, TablaGenericaComponent } from './tabla-generica.component';

/** Pruebas de la tabla genérica: encabezados ordenables y mensaje de lista vacía. */
describe('TablaGenericaComponent', () => {
  let fixture: ComponentFixture<TablaGenericaComponent>;
  // Dos columnas: una ordenable y otra de acciones (sin clave, no ordenable)
  const columnas: Columna[] = [
    { clave: 'nombre', titulo: 'Nombre', ordenable: true },
    { clave: '', titulo: 'Acciones' },
  ];

  // Ayuda: crea la tabla con el orden actual y entradas extra opcionales
  const crear = (orden: string, extra: Record<string, unknown> = {}) => {
    fixture = TestBed.createComponent(TablaGenericaComponent);
    fixture.componentRef.setInput('columnas', columnas);
    fixture.componentRef.setInput('orden', orden);
    for (const [clave, valor] of Object.entries(extra)) {
      fixture.componentRef.setInput(clave, valor);
    }
    fixture.detectChanges();
  };

  // Escenario: se hace clic en el encabezado "Nombre" dos veces, con distinto orden actual.
  // Esperado: si no estaba ordenada por esa columna sale 'nombre,asc'; si ya estaba asc, sale 'nombre,desc'.
  it('el primer clic ordena ascendente y el segundo invierte', () => {
    const emitidos: string[] = [];
    // Primer caso: el orden actual es por otra columna
    crear('creadoEn,desc');
    fixture.componentInstance.ordenar.subscribe((o) => emitidos.push(o));
    fixture.nativeElement.querySelector('thead button').click();

    // Segundo caso: ya está ordenada ascendente por nombre, así que se invierte
    crear('nombre,asc');
    fixture.componentInstance.ordenar.subscribe((o) => emitidos.push(o));
    fixture.nativeElement.querySelector('thead button').click();

    expect(emitidos).toEqual(['nombre,asc', 'nombre,desc']);
  });

  // Esperado: solo la columna ordenable tiene botón en el encabezado.
  it('las columnas sin orden no son botones', () => {
    crear('nombre,asc');
    expect(fixture.nativeElement.querySelectorAll('thead button').length).toBe(1);
  });

  // Esperado: con la bandera "vacia" se ve el texto indicado.
  it('muestra el mensaje de lista vacía', () => {
    crear('nombre,asc', { vacia: true, mensajeVacio: 'Nada por aquí' });
    expect(fixture.nativeElement.textContent).toContain('Nada por aquí');
  });
});
