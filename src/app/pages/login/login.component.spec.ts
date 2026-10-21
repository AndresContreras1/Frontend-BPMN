import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';

import { NotificacionesService } from '../../core/services/notificaciones.service';
import { SesionStore } from '../../core/services/sesion.store';
import { LoginResponse } from '../../models/usuario.model';
import { LoginComponent } from './login.component';

/** Pruebas de la página de inicio de sesión: validación, login correcto, errores y redirección segura (HU-03). */
describe('LoginComponent (HU-03)', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let backend: HttpTestingController;
  let router: Router;
  let html: HTMLElement;
  /** Parámetros de la URL con los que se abre la página (?returnUrl, ?expirada…). */
  let parametros: Record<string, string>;

  // Respuesta de login exitoso que devuelve el backend simulado
  const respuesta: LoginResponse = {
    token: 'jwt', tipo: 'Bearer', expiraEnSegundos: 1800,
    usuario: { id: 1, nombre: 'Laura', correo: 'admin@demo.com', rol: 'ADMINISTRADOR', empresaId: 1, empresaNombre: 'Demo' },
  };

  // Ayuda: crea la página y la renderiza (se llama después de fijar los "parametros" de la URL)
  const abrir = () => {
    fixture = TestBed.createComponent(LoginComponent);
    html = fixture.nativeElement;
    fixture.detectChanges();
  };

  // Ayuda: simula que el usuario escribe en un campo (eventos "input" y "blur")
  const escribir = (id: string, valor: string) => {
    const input = html.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  };

  // Ayuda: devuelve el botón de iniciar sesión
  const boton = () => html.querySelector<HTMLButtonElement>('#loginBtn')!;

  // Ayuda: pulsa el botón y actualiza la vista
  const enviar = () => {
    boton().click();
    fixture.detectChanges();
  };

  // Preparar: ActivatedRoute falso que lee los "parametros" de la prueba como si vinieran en la URL,
  // y un espía en navigateByUrl para comprobar la redirección sin navegar de verdad
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

  // verify falla si quedó alguna petición HTTP sin responder
  afterEach(() => backend.verify());

  // Esperado: con el formulario incompleto el botón está deshabilitado; al tocar un campo vacío se indica
  // que es obligatorio y no se hace ninguna petición.
  it('el botón queda deshabilitado mientras falten datos y al salir de un campo muestra qué falta', () => {
    abrir();
    expect(boton().disabled).toBeTrue();

    escribir('correo', '');
    fixture.detectChanges();
    enviar();

    backend.expectNone('/api/v1/auth/login');
    expect(html.textContent).toContain('Este campo es obligatorio');
  });

  // Esperado: un texto que no es un correo muestra el mensaje de formato inválido.
  it('valida el formato del correo', () => {
    abrir();
    escribir('correo', 'no-es-correo');
    fixture.detectChanges();
    expect(html.textContent).toContain('El correo no tiene un formato válido');
  });

  // Escenario: llegó con ?returnUrl=/empresa y el usuario escribe correo (con espacios) y contraseña.
  // Esperado: el POST lleva el correo limpio; con la respuesta queda la sesión, se muestra un aviso
  // de éxito y se navega a la ruta guardada.
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
    expect(TestBed.inject(NotificacionesService).avisos()[0].tipo).toBe('exito');
  });

  // Seguridad: se repite la misma prueba para direcciones peligrosas (sitio externo, "//" y la propia página de login).
  // Esperado: nunca se redirige a ellas; se cae en /inicio.
  for (const externa of ['https://malicioso.com', '//malicioso.com', '/login']) {
    it(`no redirige a "${externa}" después del login`, () => {
      parametros = { returnUrl: externa };
      abrir();
      escribir('correo', 'admin@demo.com');
      escribir('password', 'admin123');
      fixture.detectChanges();
      enviar();
      backend.expectOne('/api/v1/auth/login').flush(respuesta);
      expect(router.navigateByUrl).toHaveBeenCalledWith('/inicio');
    });
  }

  // Escenario: el servidor responde 401.
  // Esperado: se muestra su mensaje, no hay sesión y el botón vuelve a quedar habilitado.
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

  // Esperado: con ?expirada=true aparece el aviso de sesión vencida.
  it('avisa que la sesión expiró', () => {
    parametros = { expirada: 'true' };
    abrir();
    expect(html.querySelector('#sesionExpiradaMsg')).not.toBeNull();
  });

  // Esperado: con ?registrada=true se confirma que la empresa fue registrada.
  it('confirma el registro de la empresa', () => {
    parametros = { registrada: 'true' };
    abrir();
    expect(html.textContent).toContain('La empresa quedó registrada');
  });

  // Esperado: tras enviar, mientras no llega la respuesta el botón queda deshabilitado para no enviar dos veces.
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
