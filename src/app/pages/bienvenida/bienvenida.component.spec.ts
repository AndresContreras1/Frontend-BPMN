import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { BienvenidaComponent } from './bienvenida.component';

describe('BienvenidaComponent', () => {
  let html: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [BienvenidaComponent], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(BienvenidaComponent);
    fixture.detectChanges();
    html = fixture.nativeElement;
  });

  it('lleva a registrar la empresa o a iniciar sesión', () => {
    expect(html.querySelector('h1')?.textContent).toContain('Modele los procesos de su empresa');
    expect(html.querySelector('#empezarRegistroBtn')?.getAttribute('href')).toBe('/registro');
    expect(html.querySelector('#empezarLoginBtn')?.getAttribute('href')).toBe('/login');
  });

  it('dibuja el ejemplo del enunciado con el mismo lienzo del editor', () => {
    const lienzo = html.querySelector('#lienzoDiagrama');
    expect(lienzo).not.toBeNull();
    expect(lienzo?.querySelectorAll('.nodo').length).toBe(9);
    expect(lienzo?.textContent).toContain('Servicio de correo');
    expect(lienzo?.textContent).toContain('numeroSolicitud');
  });

  it('presenta los seis frentes del proyecto y un carrusel con los elementos del diagrama', () => {
    expect(html.querySelectorAll('.tarjeta-interactiva').length).toBe(6);
    expect(html.querySelectorAll('.carousel-item').length).toBe(5);
    expect(html.querySelectorAll('.carousel-item.active').length).toBe(1);
  });
});
