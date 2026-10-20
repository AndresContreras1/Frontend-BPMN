import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { UsuarioResumen } from '../../models/usuario.model';
import { NavbarComponent } from './navbar.component';

describe('NavbarComponent', () => {
  let fixture: ComponentFixture<NavbarComponent>;
  let html: HTMLElement;

  const ana: UsuarioResumen = {
    id: 1, nombre: 'Ana María Ruiz', correo: 'ana@a.com', rol: 'EDITOR', empresaId: 1, empresaNombre: 'Empresa A',
  };

  const crear = (usuario: UsuarioResumen | null) => {
    TestBed.configureTestingModule({ imports: [NavbarComponent], providers: [provideRouter([])] });
    fixture = TestBed.createComponent(NavbarComponent);
    fixture.componentRef.setInput('usuario', usuario);
    fixture.detectChanges();
    html = fixture.nativeElement;
  };

  it('con sesión muestra el menú, el usuario con sus iniciales, la empresa y el rol', () => {
    crear(ana);

    expect(html.querySelector('#navProcesos')?.getAttribute('href')).toBe('/procesos');
    expect(html.querySelector('#usuarioNombre')?.textContent).toContain('Ana María Ruiz');
    expect(html.querySelector('.avatar')?.textContent?.trim()).toBe('AM');
    expect(html.querySelector('#usuarioRol')?.textContent?.trim()).toBe('EDITOR');
    expect(html.textContent).toContain('Empresa A');
    expect(html.querySelector('#navLogin')).toBeNull();
  });

  it('el menú del usuario usa el plugin Dropdown de Bootstrap y avisa al padre al cerrar sesión', () => {
    crear(ana);
    let avisado = false;
    fixture.componentInstance.cerrarSesion.subscribe(() => (avisado = true));

    expect(html.querySelector('#menuUsuarioBtn')?.getAttribute('data-bs-toggle')).toBe('dropdown');
    html.querySelector<HTMLButtonElement>('#cerrarSesionBtn')?.click();
    expect(avisado).toBeTrue();
  });

  it('sin sesión ofrece iniciar sesión y registrar la empresa', () => {
    crear(null);

    expect(html.querySelector('#navLogin')).not.toBeNull();
    expect(html.querySelector('#navRegistro')?.getAttribute('href')).toBe('/registro');
    expect(html.querySelector('#navProcesos')).toBeNull();
    expect(html.querySelector('#marcaNavbar')?.getAttribute('href')).toBe('/');
  });
});
