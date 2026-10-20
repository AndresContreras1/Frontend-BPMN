import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { IndicadorComponent } from './indicador.component';

describe('IndicadorComponent', () => {
  const crear = (entradas: Record<string, unknown>) => {
    TestBed.configureTestingModule({ imports: [IndicadorComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(IndicadorComponent);
    Object.entries(entradas).forEach(([clave, valor]) => fixture.componentRef.setInput(clave, valor));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('muestra el título, el valor y el color que le pasa el padre', () => {
    const html = crear({ clave: 'borradores', titulo: 'En borrador', valor: 3, icono: 'bi-pencil-square', color: 'warning' });

    expect(html.querySelector('#indicador-borradores')).not.toBeNull();
    expect(html.textContent).toContain('En borrador');
    expect(html.querySelector('.valor-indicador')?.textContent?.trim()).toBe('3');
    expect(html.querySelector('.icono-circulo')?.classList).toContain('bg-warning-subtle');
  });

  it('con ruta la tarjeta entera lleva a la página con sus filtros', () => {
    const html = crear({ clave: 'publicados', titulo: 'Publicados', valor: 1, ruta: '/procesos', parametros: { estado: 'PUBLICADO' } });

    expect(html.querySelector('a.stretched-link')?.getAttribute('href')).toBe('/procesos?estado=PUBLICADO');
  });

  it('sin ruta no es un enlace', () => {
    const html = crear({ clave: 'x', titulo: 'X', valor: 0 });

    expect(html.querySelector('a')).toBeNull();
  });
});
