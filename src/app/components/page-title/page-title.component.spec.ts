import { TestBed } from '@angular/core/testing';

import { PageTitleComponent } from './page-title.component';

describe('PageTitleComponent', () => {
  const crear = (entradas: Record<string, string>) => {
    TestBed.configureTestingModule({ imports: [PageTitleComponent] });
    const fixture = TestBed.createComponent(PageTitleComponent);
    Object.entries(entradas).forEach(([clave, valor]) => fixture.componentRef.setInput(clave, valor));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('muestra el título, el subtítulo y las historias de usuario que cubre la pantalla', () => {
    const html = crear({ titulo: 'Procesos', subtitulo: 'Procesos de la empresa', hu: 'HU-06, HU-07' });

    expect(html.querySelector('h1')!.textContent).toContain('Procesos');
    expect(html.textContent).toContain('Procesos de la empresa');
    expect(html.querySelector('#historiasPagina')!.textContent!.trim()).toBe('HU-06, HU-07');
  });

  it('sin historias no dibuja la etiqueta', () => {
    const html = crear({ titulo: 'Mi empresa' });

    expect(html.querySelector('#historiasPagina')).toBeNull();
  });
});
