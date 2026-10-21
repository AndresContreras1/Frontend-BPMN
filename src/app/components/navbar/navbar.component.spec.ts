import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { UsuarioResumen } from '../../models/usuario.model';
import { NavbarComponent } from './navbar.component';

/** Pruebas de la barra de navegación: cambia según haya o no un usuario con sesión. */
describe('NavbarComponent', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let html: HTMLElement;

  // Usuario de ejemplo que se pasa como sesión iniciada
  const ana: UsuarioResumen = {
    id: 1, nombre: 'Ana María Ruiz', correo: 'ana@a.com', rol: 'EDITOR', empresaId: 1, empresaNombre: 'Empresa A',
  };

  // Ayuda: crea la barra con un usuario (o null si no hay sesión). provideRouter([]) habilita los enlaces.
  const crear = (usuario: UsuarioResumen | null) => {
    TestBed.configureTestingModule({ imports: [NavbarComponent], providers: [provideRouter([])] });
    fixture = TestBed.createComponent(NavbarComponent);
    // setInput simula el input "usuario" que entrega el componente padre
    fixture.componentRef.setInput('usuario', usuario);
    fixture.detectChanges();
    html = fixture.nativeElement;
  };

  // Escenario: hay un usuario con sesión.
  // Esperado: se ve el menú, el nombre, las iniciales, el rol y la empresa, y no el enlace de login.
  it('con sesión muestra el menú, el usuario con sus iniciales, la empresa y el rol', () => {
    crear(ana);

    expect(html.querySelector('#navProcesos')?.getAttribute('href')).toBe('/procesos');
    expect(html.querySelector('#usuarioNombre')?.textContent).toContain('Ana María Ruiz');
    expect(html.querySelector('.avatar')?.textContent?.trim()).toBe('AM');
    expect(html.querySelector('#usuarioRol')?.textContent?.trim()).toBe('EDITOR');
    expect(html.textContent).toContain('Empresa A');
    expect(html.querySelector('#navLogin')).toBeNull();
  });

  // Escenario: se pulsa "Cerrar sesión" en el menú desplegable.
  // Esperado: el botón del menú usa el atributo de Bootstrap y el componente avisa al padre con un output.
  it('el menú del usuario usa el plugin Dropdown de Bootstrap y avisa al padre al cerrar sesión', () => {
    crear(ana);
    let avisado = false;
    // Nos suscribimos al output para saber si se emitió
    fixture.componentInstance.cerrarSesion.subscribe(() => (avisado = true));

    expect(html.querySelector('#menuUsuarioBtn')?.getAttribute('data-bs-toggle')).toBe('dropdown');
    html.querySelector<HTMLButtonElement>('#cerrarSesionBtn')?.click();
    expect(avisado).toBeTrue();
  });

  // Escenario: no hay usuario (null).
  // Esperado: aparecen login y registro, y desaparece el menú de procesos.
  it('sin sesión ofrece iniciar sesión y registrar la empresa', () => {
    crear(null);

    expect(html.querySelector('#navLogin')).not.toBeNull();
    expect(html.querySelector('#navRegistro')?.getAttribute('href')).toBe('/registro');
    expect(html.querySelector('#navProcesos')).toBeNull();
    expect(html.querySelector('#marcaNavbar')?.getAttribute('href')).toBe('/');
  });
});
