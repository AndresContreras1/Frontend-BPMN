import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { IndicadorComponent } from './indicador.component';

/** Pruebas de la tarjeta de indicador (un número con título, icono y color) del panel de inicio. */
describe('IndicadorComponent', () => {
  // Ayuda: crea el componente con las entradas indicadas y devuelve su HTML.
  // provideRouter([]) da un router vacío para que funcionen los enlaces (routerLink).
  const crear = (entradas: Record<string, unknown>) => {
    TestBed.configureTestingModule({ imports: [IndicadorComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(IndicadorComponent);
    // setInput simula los datos que le pasaría el componente padre
    Object.entries(entradas).forEach(([clave, valor]) => fixture.componentRef.setInput(clave, valor));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  // Escenario: se pasan clave, título, valor, icono y color.
  // Esperado: se ven el título y el valor, y el icono usa la clase del color.
  it('muestra el título, el valor y el color que le pasa el padre', () => {
    const html = crear({ clave: 'borradores', titulo: 'En borrador', valor: 3, icono: 'bi-pencil-square', color: 'warning' });

    expect(html.querySelector('#indicador-borradores')).not.toBeNull();
    expect(html.textContent).toContain('En borrador');
    expect(html.querySelector('.valor-indicador')?.textContent?.trim()).toBe('3');
    expect(html.querySelector('.icono-circulo')?.classList).toContain('bg-warning-subtle');
  });

  // Escenario: se pasa una ruta con parámetros.
  // Esperado: la tarjeta es un enlace a esa ruta con los filtros en la URL.
  it('con ruta la tarjeta entera lleva a la página con sus filtros', () => {
    const html = crear({ clave: 'publicados', titulo: 'Publicados', valor: 1, ruta: '/procesos', parametros: { estado: 'PUBLICADO' } });

    expect(html.querySelector('a.stretched-link')?.getAttribute('href')).toBe('/procesos?estado=PUBLICADO');
  });

  // Escenario: no se pasa ruta.
  // Esperado: no hay ningún enlace en la tarjeta.
  it('sin ruta no es un enlace', () => {
    const html = crear({ clave: 'x', titulo: 'X', valor: 0 });

    expect(html.querySelector('a')).toBeNull();
  });
});
