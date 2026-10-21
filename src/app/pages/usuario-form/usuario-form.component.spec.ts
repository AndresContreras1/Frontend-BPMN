import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { UsuarioFormComponent } from './usuario-form.component';

/** Pruebas del formulario para invitar (crear) un usuario de la empresa (HU-02). */
describe('UsuarioFormComponent (HU-02)', () => {
  let fixture: ComponentFixture<UsuarioFormComponent>;
  let backend: HttpTestingController;
  let router: Router;
  let html: HTMLElement;

  // Ayuda: simula que el usuario escribe en un campo (eventos "input" y "blur")
  const escribir = (id: string, valor: string) => {
    const input = html.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  };

  // Ayuda: llena todos los campos con datos válidos y elige el rol LECTOR en el select (evento "change")
  const llenar = () => {
    escribir('nombre', ' Diego Ruiz ');
    escribir('correo', 'diego@demo.com');
    escribir('passwordInicial', 'Bienvenido2026');
    const rol = html.querySelector<HTMLSelectElement>('#rol')!;
    rol.value = 'LECTOR';
    rol.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };

  // Ayuda: pulsa el botón de guardar
  const enviar = () => {
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#guardarUsuarioBtn')!.click();
    fixture.detectChanges();
  };

  // Preparar: backend HTTP simulado y un espía en router.navigate (resolveTo(true) simula una navegación exitosa)
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [UsuarioFormComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(UsuarioFormComponent);
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    html = fixture.nativeElement;
    fixture.detectChanges();
  });

  // verify falla si quedó alguna petición HTTP sin responder
  afterEach(() => backend.verify());

  // Esperado: el rol por defecto es EDITOR y se muestra la descripción de lo que puede hacer.
  it('propone EDITOR y explica qué puede hacer cada rol', () => {
    expect(html.querySelector<HTMLSelectElement>('#rol')!.value).toBe('EDITOR');
    expect(html.textContent).toContain('Crea y modela procesos');
  });

  // Esperado: con el formulario vacío el botón está deshabilitado; al salir de cada campo (blur)
  // aparecen mensajes de error y no se hace ninguna petición.
  it('no envía sin los campos obligatorios: el botón sigue deshabilitado y cada campo dice qué falta', () => {
    expect(html.querySelector<HTMLButtonElement>('#guardarUsuarioBtn')!.disabled).toBeTrue();
    html.querySelectorAll('input, select, textarea').forEach((c: Element) => c.dispatchEvent(new Event('blur')));
    fixture.detectChanges();
    backend.expectNone('/api/v1/usuarios');
    expect(html.querySelectorAll('.invalid-feedback').length).toBeGreaterThanOrEqual(3);
  });

  // Escenario: formulario válido enviado (el nombre lleva espacios de más).
  // Esperado: POST con el cuerpo limpio; con la respuesta se navega a la lista con el nombre en la URL.
  it('invita al usuario y vuelve a la lista con el aviso', () => {
    llenar();
    enviar();
    const req = backend.expectOne({ method: 'POST', url: '/api/v1/usuarios' });
    expect(req.request.body).toEqual({ nombre: 'Diego Ruiz', correo: 'diego@demo.com', rol: 'LECTOR', passwordInicial: 'Bienvenido2026' });
    req.flush({ id: 7, nombre: 'Diego Ruiz', correo: 'diego@demo.com', rol: 'LECTOR', activo: true, creadoEn: '' });
    expect(router.navigate).toHaveBeenCalledWith(['/usuarios'], { queryParams: { creado: 'Diego Ruiz' } });
  });

  // Escenario: el servidor responde 409 (correo ya registrado).
  // Esperado: se muestra el motivo y no se navega.
  it('correo repetido: muestra la regla de negocio y se queda en el formulario', () => {
    llenar();
    enviar();
    backend.expectOne('/api/v1/usuarios').flush(
      { title: 'Regla de negocio', status: 409, detail: 'El correo diego@demo.com ya está registrado como usuario' },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();
    expect(html.textContent).toContain('ya está registrado como usuario');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  // Esperado: ante un 403 se muestra el mensaje del servidor y la página sigue funcionando.
  it('un 403 (rol cambiado mientras tanto) se muestra sin romper la página', () => {
    llenar();
    enviar();
    backend.expectOne('/api/v1/usuarios').flush(
      { title: 'Sin permisos', status: 403, detail: 'Su rol no permite realizar esta operación' },
      { status: 403, statusText: 'Forbidden' },
    );
    fixture.detectChanges();
    expect(html.textContent).toContain('Su rol no permite realizar esta operación');
  });
});
