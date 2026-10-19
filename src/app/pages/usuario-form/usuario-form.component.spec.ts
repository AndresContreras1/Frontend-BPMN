import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { UsuarioFormComponent } from './usuario-form.component';

describe('UsuarioFormComponent (HU-02)', () => {
  let fixture: ComponentFixture<UsuarioFormComponent>;
  let backend: HttpTestingController;
  let router: Router;
  let html: HTMLElement;

  const escribir = (id: string, valor: string) => {
    const input = html.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  };

  const llenar = () => {
    escribir('nombre', ' Diego Ruiz ');
    escribir('correo', 'diego@demo.com');
    escribir('passwordInicial', 'Bienvenido2026');
    const rol = html.querySelector<HTMLSelectElement>('#rol')!;
    rol.value = 'LECTOR';
    rol.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  };

  const enviar = () => {
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#guardarUsuarioBtn')!.click();
    fixture.detectChanges();
  };

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

  afterEach(() => backend.verify());

  it('propone EDITOR y explica qué puede hacer cada rol', () => {
    expect(html.querySelector<HTMLSelectElement>('#rol')!.value).toBe('EDITOR');
    expect(html.textContent).toContain('Crea y modela procesos');
  });

  it('no envía sin los campos obligatorios: el botón sigue deshabilitado y cada campo dice qué falta', () => {
    expect(html.querySelector<HTMLButtonElement>('#guardarUsuarioBtn')!.disabled).toBeTrue();
    html.querySelectorAll('input, select, textarea').forEach((c: Element) => c.dispatchEvent(new Event('blur')));
    fixture.detectChanges();
    backend.expectNone('/api/v1/usuarios');
    expect(html.querySelectorAll('.invalid-feedback').length).toBeGreaterThanOrEqual(3);
  });

  it('invita al usuario y vuelve a la lista con el aviso', () => {
    llenar();
    enviar();
    const req = backend.expectOne({ method: 'POST', url: '/api/v1/usuarios' });
    expect(req.request.body).toEqual({ nombre: 'Diego Ruiz', correo: 'diego@demo.com', rol: 'LECTOR', passwordInicial: 'Bienvenido2026' });
    req.flush({ id: 7, nombre: 'Diego Ruiz', correo: 'diego@demo.com', rol: 'LECTOR', activo: true, creadoEn: '' });
    expect(router.navigate).toHaveBeenCalledWith(['/usuarios'], { queryParams: { creado: 'Diego Ruiz' } });
  });

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
