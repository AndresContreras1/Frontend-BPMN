import { TestBed } from '@angular/core/testing';

import { PageTitleComponent } from './page-title.component';

/** Pruebas del encabezado reutilizable de las páginas (título, subtítulo e historias de usuario). */
describe('PageTitleComponent', () => {
  // Ayuda: crea el componente, le pasa las entradas (inputs) y devuelve su HTML ya renderizado
  const crear = (entradas: Record<string, string>) => {
    TestBed.configureTestingModule({ imports: [PageTitleComponent] });
    const fixture = TestBed.createComponent(PageTitleComponent);
    // setInput asigna un input del componente como si lo pasara el padre en la plantilla
    Object.entries(entradas).forEach(([clave, valor]) => fixture.componentRef.setInput(clave, valor));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  // Escenario: se pasan título, subtítulo y historias.
  // Esperado: los tres textos aparecen en el HTML.
  it('muestra el título, el subtítulo y las historias de usuario que cubre la pantalla', () => {
    const html = crear({ titulo: 'Procesos', subtitulo: 'Procesos de la empresa', hu: 'HU-06, HU-07' });

    expect(html.querySelector('h1')!.textContent).toContain('Procesos');
    expect(html.textContent).toContain('Procesos de la empresa');
    expect(html.querySelector('#historiasPagina')!.textContent!.trim()).toBe('HU-06, HU-07');
  });

  // Escenario: no se pasa el input "hu".
  // Esperado: el elemento de historias no existe en el DOM.
  it('sin historias no dibuja la etiqueta', () => {
    const html = crear({ titulo: 'Mi empresa' });

    expect(html.querySelector('#historiasPagina')).toBeNull();
  });
});
