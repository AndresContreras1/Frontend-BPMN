import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';

import { SesionStore } from '../../core/services/sesion.store';
import { LoginResponse } from '../../models/usuario.model';
import { LoginComponent } from './login.component';

describe('LoginComponent (HU-03)', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let backend: HttpTestingController;
  let router: Router;
  let html: HTMLElement;
  /** Parámetros de la URL con los que se abre la página (?returnUrl, ?expirada…). */
  let parametros: Record<string, string>;

  const respuesta: LoginResponse = {
    token: 'jwt', tipo: 'Bearer', expiraEnSegundos: 1800,
    usuario: { id: 1, nombre: 'Laura', correo: 'admin@demo.com', rol: 'ADMINISTRADOR', empresaId: 1, empresaNombre: 'Demo' },
  };

  const abrir = () => {
    fixture = TestBed.createComponent(LoginComponent);
    html = fixture.nativeElement;
    fixture.detectChanges();
  };

  const escribir = (id: string, valor: string) => {
    const input = html.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  };

  const boton = () => html.querySelector<HTMLButtonElement>('#loginBtn')!;

  const enviar = () => {
    boton().click();
    fixture.detectChanges();
  };

  beforeEach(() => {
    localStorage.clear();
    parametros = {};
    TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { get queryParamMap() { return convertToParamMap(parametros); } } } },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
  });

  afterEach(() => backend.verify());

  it('no envía el formulario vacío y muestra qué falta', () => {
    abrir();
    enviar();
    backend.expectNone('/api/v1/auth/login');
    expect(html.textContent).toContain('Este campo es obligatorio');
  });

  it('valida el formato del correo', () => {
    abrir();
    escribir('correo', 'no-es-correo');
    fixture.detectChanges();
    expect(html.textContent).toContain('El correo no tiene un formato válido');
  });

  it('inicia sesión y vuelve a la ruta que pidió el guard', () => {
    parametros = { returnUrl: '/empresa' };
    abrir();
    escribir('correo', '  admin@demo.com ');
    escribir('password', 'admin123');
    fixture.detectChanges();
    expect(boton().disabled).toBeFalse();
    enviar();

    const req = backend.expectOne('/api/v1/auth/login');
    expect(req.request.body).toEqual({ correo: 'admin@demo.com', password: 'admin123' });
    req.flush(respuesta);

    expect(TestBed.inject(SesionStore).autenticado()).toBeTrue();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/empresa');
  });

  for (const externa of ['https://malicioso.com', '//malicioso.com', '/login']) {
    it(`no redirige a "${externa}" después del login`, () => {
      parametros = { returnUrl: externa };
      abrir();
      escribir('correo', 'admin@demo.com');
      escribir('password', 'admin123');
      fixture.detectChanges();
      enviar();
      backend.expectOne('/api/v1/auth/login').flush(respuesta);
      expect(router.navigateByUrl).toHaveBeenCalledWith('/');
    });
  }

  it('muestra el mensaje del backend con credenciales inválidas y no guarda sesión', () => {
    abrir();
    escribir('correo', 'admin@demo.com');
    escribir('password', 'mala');
    fixture.detectChanges();
    enviar();
    backend.expectOne('/api/v1/auth/login').flush(
      { title: 'Credenciales inválidas', status: 401, detail: 'Correo o contraseña incorrectos' },
      { status: 401, statusText: 'Unauthorized' },
    );
    fixture.detectChanges();

    expect(html.textContent).toContain('Correo o contraseña incorrectos');
    expect(TestBed.inject(SesionStore).autenticado()).toBeFalse();
    expect(boton().disabled).toBeFalse();
  });

  it('avisa que la sesión expiró', () => {
    parametros = { expirada: 'true' };
    abrir();
    expect(html.querySelector('#sesionExpiradaMsg')).not.toBeNull();
  });

  it('confirma el registro de la empresa', () => {
    parametros = { registrada: 'true' };
    abrir();
    expect(html.textContent).toContain('La empresa quedó registrada');
  });

  it('deshabilita el botón mientras espera la respuesta (evita doble envío)', () => {
    abrir();
    escribir('correo', 'admin@demo.com');
    escribir('password', 'admin123');
    fixture.detectChanges();
    enviar();
    expect(boton().disabled).toBeTrue();
    backend.expectOne('/api/v1/auth/login').flush(respuesta);
  });
});
