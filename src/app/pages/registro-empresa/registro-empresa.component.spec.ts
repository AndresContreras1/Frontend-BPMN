import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';

import { NotificacionesService } from '../../core/services/notificaciones.service';
import { SesionStore } from '../../core/services/sesion.store';
import { RegistroEmpresaComponent } from './registro-empresa.component';

/** Pruebas del formulario de registro de una empresa y su administrador (HU-01). */
describe('RegistroEmpresaComponent (HU-01)', () => {
  let fixture: ComponentFixture<RegistroEmpresaComponent>;
  let backend: HttpTestingController;
  let router: Router;
  let html: HTMLElement;

  // Ayuda: rellena el formulario con datos válidos (se pueden cambiar algunos con "cambios").
  // Por cada campo se asigna el valor y se lanzan los eventos "input" y "blur" para que Angular lo registre.
  const llenar = (cambios: Partial<Record<string, string>> = {}) => {
    const datos: Record<string, string> = {
      nombre: 'Facimus S.A.S.', nit: '900123456-1', correoContacto: 'laura@facimus.com',
      nombreRepresentante: 'Laura Gómez', password: 'ClaveSegura2026', ...cambios,
    };
    for (const [id, valor] of Object.entries(datos)) {
      const input = html.querySelector<HTMLInputElement>(`#${id}`)!;
      input.value = valor;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
    }
    fixture.detectChanges();
  };

  // Ayuda: pulsa el botón de registrar
  const enviar = () => {
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#registrarEmpresaBtn')!.click();
    fixture.detectChanges();
  };

  // Preparar: backend HTTP simulado, router vacío y un espía en router.navigate para no navegar de verdad
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [RegistroEmpresaComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(RegistroEmpresaComponent);
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    html = fixture.nativeElement;
    fixture.detectChanges();
  });

  // verify falla si quedó alguna petición HTTP sin responder
  afterEach(() => backend.verify());

  // Esperado: con un NIT inválido no se llama a la API y se muestra el mensaje de validación.
  it('rechaza un NIT con formato inválido sin llamar a la API', () => {
    llenar({ nit: '12-ab' });
    enviar();
    backend.expectNone('/api/v1/empresas');
    expect(html.textContent).toContain('El NIT debe tener entre 5 y 15 dígitos');
  });

  // Esperado: una contraseña corta no se envía y se muestra el mensaje de longitud mínima.
  it('exige contraseña de al menos 8 caracteres', () => {
    llenar({ password: 'corta' });
    enviar();
    backend.expectNone('/api/v1/empresas');
    expect(html.textContent).toContain('Debe tener al menos 8 caracteres');
  });

  // Escenario: registro correcto (el nombre se envía con espacios de más).
  // Esperado: POST de la empresa con el nombre limpio; luego login automático con el correo de contacto;
  // queda la sesión de administrador, se navega a /inicio y se muestra un aviso de éxito.
  it('registra la empresa y entra con el correo de contacto', () => {
    llenar({ nombre: '  Facimus S.A.S.  ' });
    enviar();

    const registro = backend.expectOne({ method: 'POST', url: '/api/v1/empresas' });
    expect(registro.request.body.nombre).toBe('Facimus S.A.S.');
    registro.flush({ empresa: { id: 5 }, administrador: { id: 9 } }, { status: 201, statusText: 'Created' });

    const login = backend.expectOne('/api/v1/auth/login');
    expect(login.request.body).toEqual({ correo: 'laura@facimus.com', password: 'ClaveSegura2026' });
    login.flush({
      token: 'jwt', tipo: 'Bearer', expiraEnSegundos: 1800,
      usuario: { id: 9, nombre: 'Laura Gómez', correo: 'laura@facimus.com', rol: 'ADMINISTRADOR', empresaId: 5, empresaNombre: 'Facimus S.A.S.' },
    });

    expect(TestBed.inject(SesionStore).esAdministrador()).toBeTrue();
    expect(router.navigate).toHaveBeenCalledWith(['/inicio']);
    expect(TestBed.inject(NotificacionesService).avisos()[0].mensaje).toContain('Facimus S.A.S. quedó registrada');
  });

  // Escenario: el servidor responde 409 (el NIT ya existe).
  // Esperado: se muestra el detalle, no se hace el login y no hay sesión.
  it('NIT repetido: muestra la regla de negocio (409) y no inicia sesión', () => {
    llenar();
    enviar();
    backend.expectOne('/api/v1/empresas').flush(
      { title: 'Regla de negocio', status: 409, detail: 'Ya existe una empresa registrada con el NIT 900123456-1' },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    backend.expectNone('/api/v1/auth/login');
    expect(html.textContent).toContain('Ya existe una empresa registrada con el NIT 900123456-1');
    expect(TestBed.inject(SesionStore).autenticado()).toBeFalse();
  });

  // Escenario: el servidor responde 400 con errores por campo.
  // Esperado: el mensaje aparece bajo el campo correspondiente y el control queda con el error "servidor".
  it('pone debajo de cada campo los errores de validación del backend (400)', () => {
    llenar();
    enviar();
    backend.expectOne('/api/v1/empresas').flush(
      { title: 'Datos inválidos', status: 400, detail: 'Uno o más campos no cumplen las validaciones',
        errors: { correoContacto: 'El correo de contacto no tiene un formato válido' } },
      { status: 400, statusText: 'Bad Request' },
    );
    fixture.detectChanges();

    const campo = html.querySelector('#correoContacto')!.parentElement!;
    expect(campo.textContent).toContain('El correo de contacto no tiene un formato válido');
    expect(fixture.componentInstance.registroForm.controls.correoContacto.hasError('servidor')).toBeTrue();
  });

  // Escenario: la empresa se crea (201) pero el login automático falla (500).
  // Esperado: se redirige a /login con el parámetro "registrada" y no se queda iniciada la sesión.
  it('si el login posterior falla, lleva al login con el aviso de registro', () => {
    llenar();
    enviar();
    backend.expectOne('/api/v1/empresas').flush({}, { status: 201, statusText: 'Created' });
    backend.expectOne('/api/v1/auth/login').flush({ title: 'Error' }, { status: 500, statusText: 'Server Error' });

    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { registrada: true } });
    expect(TestBed.inject(SesionStore).autenticado()).toBeFalse();
  });
});
