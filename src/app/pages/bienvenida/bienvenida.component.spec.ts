import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { BienvenidaComponent } from './bienvenida.component';

/** Pruebas de la página de bienvenida (pública): enlaces de entrada, diagrama de ejemplo y secciones informativas. */
describe('BienvenidaComponent', () => {
  let html: HTMLElement;

  // Preparar (antes de cada prueba): se crea la página con un router vacío y se renderiza una vez
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BienvenidaComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(BienvenidaComponent);
    fixture.detectChanges();
    html = fixture.nativeElement;
  });

  // Esperado: el título principal y los botones apuntan a /registro y /login.
  it('lleva a registrar la empresa o a iniciar sesión', () => {
    expect(html.querySelector('h1')?.textContent).toContain('Modele los procesos de su empresa');
    expect(html.querySelector('#empezarRegistroBtn')?.getAttribute('href')).toBe('/registro');
    expect(html.querySelector('#empezarLoginBtn')?.getAttribute('href')).toBe('/login');
  });

  // Esperado: el lienzo muestra el diagrama de ejemplo con sus 9 nodos y textos conocidos.
  it('dibuja el ejemplo del enunciado con el mismo lienzo del editor', () => {
    const lienzo = html.querySelector('#lienzoDiagrama');
    expect(lienzo).not.toBeNull();
    expect(lienzo?.querySelectorAll('.nodo').length).toBe(9);
    expect(lienzo?.textContent).toContain('Servicio de correo');
    expect(lienzo?.textContent).toContain('numeroSolicitud');
  });

  // Esperado: seis tarjetas, un carrusel con cinco elementos y solo uno activo a la vez.
  it('presenta los seis frentes del proyecto y un carrusel con los elementos del diagrama', () => {
    expect(html.querySelectorAll('.tarjeta-interactiva').length).toBe(6);
    expect(html.querySelectorAll('.carousel-item').length).toBe(5);
    expect(html.querySelectorAll('.carousel-item.active').length).toBe(1);
  });
});
