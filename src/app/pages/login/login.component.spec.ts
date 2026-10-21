import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { SesionStore } from '../../core/services/sesion.store';
import { LoginResponse } from '../../models/usuario.model';
import { LoginComponent } from './login.component';

describe('LoginComponent (HU-03)', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let backend: HttpTestingController;
  let router: Router;
  let html: HTMLElement;

  const respuesta: LoginResponse = {
    token: 'jwt', tipo: 'Bearer', expiraEnSegundos: 1800,
    usuario: { id: 1, nombre: 'Laura', correo: 'admin@demo.com', rol: 'ADMINISTRADOR', empresaId: 1, empresaNombre: 'Demo' },
  };

  const escribir = (id: string, valor: string) => {
    const input = html.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  };

  const enviar = () => {
    html.querySelector<HTMLButtonElement>('#loginBtn')!.click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(LoginComponent);
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    html = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => backend.verify());

  it('no envía el formulario vacío y muestra qué falta', () => {
    enviar();
    backend.expectNone('/api/v1/auth/login');
    expect(html.textContent).toContain('Este campo es obligatorio');
  });

  it('valida el formato del correo', () => {
    escribir('correo', 'no-es-correo');
    fixture.detectChanges();
    expect(html.textContent).toContain('El correo no tiene un formato válido');
  });

  it('inicia sesión y vuelve a la ruta que pidió el guard', () => {
    fixture.componentRef.setInput('returnUrl', '/empresa');
    escribir('correo', '  admin@demo.com ');
    escribir('password', 'admin123');
    enviar();

    const req = backend.expectOne('/api/v1/auth/login');
    expect(req.request.body).toEqual({ correo: 'admin@demo.com', password: 'admin123' });
    req.flush(respuesta);

    expect(TestBed.inject(SesionStore).autenticado()).toBeTrue();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/empresa');
  });

  for (const externa of ['https://malicioso.com', '//malicioso.com', '/login']) {
    it(`no redirige a "${externa}" después del login`, () => {
      fixture.componentRef.setInput('returnUrl', externa);
      escribir('correo', 'admin@demo.com');
      escribir('password', 'admin123');
      enviar();
      backend.expectOne('/api/v1/auth/login').flush(respuesta);
      expect(router.navigateByUrl).toHaveBeenCalledWith('/');
    });
  }

  it('muestra el mensaje del backend con credenciales inválidas y no guarda sesión', () => {
    escribir('correo', 'admin@demo.com');
    escribir('password', 'mala');
    enviar();
    backend.expectOne('/api/v1/auth/login').flush(
      { title: 'Credenciales inválidas', status: 401, detail: 'Correo o contraseña incorrectos' },
      { status: 401, statusText: 'Unauthorized' },
    );
    fixture.detectChanges();

    expect(html.textContent).toContain('Correo o contraseña incorrectos');
    expect(TestBed.inject(SesionStore).autenticado()).toBeFalse();
    expect(html.querySelector<HTMLButtonElement>('#loginBtn')!.disabled).toBeFalse();
  });

  it('avisa que la sesión expiró', () => {
    fixture.componentRef.setInput('expirada', 'true');
    fixture.detectChanges();
    expect(html.querySelector('#sesionExpiradaMsg')).not.toBeNull();
  });

  it('deshabilita el botón mientras espera la respuesta (evita doble envío)', () => {
    escribir('correo', 'admin@demo.com');
    escribir('password', 'admin123');
    enviar();
    expect(html.querySelector<HTMLButtonElement>('#loginBtn')!.disabled).toBeTrue();
    backend.expectOne('/api/v1/auth/login').flush(respuesta);
  });
});
