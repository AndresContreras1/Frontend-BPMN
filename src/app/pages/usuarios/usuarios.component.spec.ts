import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SesionStore } from '../../core/services/sesion.store';
import { RolAcceso, Usuario } from '../../models/usuario.model';
import { UsuariosComponent } from './usuarios.component';

describe('UsuariosComponent (HU-02)', () => {
  let fixture: ComponentFixture<UsuariosComponent>;
  let backend: HttpTestingController;
  let html: HTMLElement;

  const ana: Usuario = { id: 1, nombre: 'Ana', correo: 'ana@a.com', rol: 'ADMINISTRADOR', activo: true, creadoEn: '2026-10-01T10:00:00Z' };
  const beto: Usuario = { id: 2, nombre: 'Beto', correo: 'beto@a.com', rol: 'EDITOR', activo: true, creadoEn: '2026-10-02T10:00:00Z' };
  const carla: Usuario = { id: 3, nombre: 'Carla', correo: 'carla@a.com', rol: 'LECTOR', activo: false, creadoEn: '2026-10-03T10:00:00Z' };

  const pagina = (content: Usuario[], totalPages = 1) =>
    ({ content, page: 0, size: 10, totalElements: content.length, totalPages });

  const esLista = (r: { method: string; url: string }) => r.method === 'GET' && r.url === '/api/v1/usuarios';

  /** Crea la página con la sesión del rol indicado y responde la primera consulta. */
  const crear = (rol: RolAcceso, usuarios: Usuario[] = [ana, beto, carla]): TestRequest => {
    TestBed.inject(SesionStore).iniciar({
      token: 't', tipo: 'Bearer', expiraEnSegundos: 1800,
      usuario: { id: 1, nombre: 'Ana', correo: 'ana@a.com', rol, empresaId: 1, empresaNombre: 'Demo' },
    });
    fixture = TestBed.createComponent(UsuariosComponent);
    html = fixture.nativeElement;
    fixture.detectChanges();
    tick(300);
    const req = backend.expectOne(esLista);
    req.flush(pagina(usuarios));
    fixture.detectChanges();
    return req;
  };

  const recargar = () => {
    fixture.detectChanges();
    tick(300);
    backend.expectOne(esLista).flush(pagina([ana, beto, carla]));
    fixture.detectChanges();
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [UsuariosComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('carga la primera página ordenada por nombre', fakeAsync(() => {
    const req = crear('ADMINISTRADOR');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.get('size')).toBe('10');
    expect(req.request.params.get('sort')).toBe('nombre,asc');
    expect(req.request.params.has('nombre')).toBeFalse();
    expect(html.querySelectorAll('tbody tr').length).toBe(3);
  }));

  it('busca por nombre solo cuando el usuario deja de escribir', fakeAsync(() => {
    crear('ADMINISTRADOR');
    const input = html.querySelector<HTMLInputElement>('#buscarUsuario')!;
    for (const texto of ['b', 'be', 'bet']) {
      input.value = texto;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      tick(100);
    }
    tick(300);
    const pedidas = backend.match(esLista);
    expect(pedidas.length).toBe(1);
    expect(pedidas[0].request.params.get('nombre')).toBe('bet');
    pedidas[0].flush(pagina([beto]));
  }));

  it('el administrador no puede cambiar su propio rol ni desactivarse', fakeAsync(() => {
    crear('ADMINISTRADOR');
    const filaAna = html.querySelectorAll('tbody tr')[0];
    expect(filaAna.textContent).toContain('Usted');
    expect(filaAna.querySelector<HTMLSelectElement>('select')!.disabled).toBeTrue();
    expect(html.querySelector('#desactivarUsuarioBtn-1')).toBeNull();
    expect(html.querySelector('#desactivarUsuarioBtn-2')).not.toBeNull();
    expect(html.querySelector('#activarUsuarioBtn-3')).not.toBeNull();
  }));

  for (const rol of ['EDITOR', 'LECTOR'] as RolAcceso[]) {
    it(`el ${rol} ve la lista sin acciones de administración`, fakeAsync(() => {
      crear(rol);
      expect(html.querySelectorAll('tbody tr').length).toBe(3);
      expect(html.querySelector('select')).toBeNull();
      expect(html.querySelector('#invitarUsuarioBtn')).toBeNull();
      expect(html.querySelector('thead')!.textContent).not.toContain('Acciones');
    }));
  }

  it('cambia el rol de un usuario y recarga la lista', fakeAsync(() => {
    crear('ADMINISTRADOR');
    const select = html.querySelectorAll('tbody tr')[1].querySelector<HTMLSelectElement>('select')!;
    select.value = 'LECTOR';
    select.dispatchEvent(new Event('change'));

    const req = backend.expectOne({ method: 'PUT', url: '/api/v1/usuarios/2/rol' });
    expect(req.request.body).toEqual({ rol: 'LECTOR' });
    req.flush({ ...beto, rol: 'LECTOR' });
    recargar();

    expect(html.querySelector('#avisoUsuarios')!.textContent).toContain('Beto ahora tiene el rol LECTOR');
  }));

  it('si la API rechaza el cambio de rol, el select vuelve al rol anterior y se ve el motivo', fakeAsync(() => {
    crear('ADMINISTRADOR');
    const select = html.querySelectorAll('tbody tr')[1].querySelector<HTMLSelectElement>('select')!;
    select.value = 'LECTOR';
    select.dispatchEvent(new Event('change'));
    backend.expectOne({ method: 'PUT', url: '/api/v1/usuarios/2/rol' }).flush(
      { title: 'Regla de negocio', status: 409, detail: 'La empresa debe conservar al menos un administrador activo' },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(select.value).toBe('EDITOR');
    expect(html.textContent).toContain('La empresa debe conservar al menos un administrador activo');
  }));

  it('desactivar pide confirmación y cancelar no llama a la API', fakeAsync(() => {
    crear('ADMINISTRADOR');
    html.querySelector<HTMLButtonElement>('#desactivarUsuarioBtn-2')!.click();
    fixture.detectChanges();
    expect(html.querySelector('.modal')!.textContent).toContain('¿Desactivar a Beto?');

    html.querySelector<HTMLButtonElement>('.modal .btn-secondary')!.click();
    fixture.detectChanges();
    expect(html.querySelector('.modal')).toBeNull();
    backend.expectNone({ method: 'PATCH', url: '/api/v1/usuarios/2/desactivar' });
  }));

  it('desactiva al confirmar y avisa que ya no puede entrar', fakeAsync(() => {
    crear('ADMINISTRADOR');
    html.querySelector<HTMLButtonElement>('#desactivarUsuarioBtn-2')!.click();
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#confirmarEliminarBtn')!.click();

    backend.expectOne({ method: 'PATCH', url: '/api/v1/usuarios/2/desactivar' }).flush({ ...beto, activo: false });
    recargar();
    expect(html.querySelector('#avisoUsuarios')!.textContent).toContain('ya no puede iniciar sesión');
  }));

  it('reactiva un usuario desactivado', fakeAsync(() => {
    crear('ADMINISTRADOR');
    html.querySelector<HTMLButtonElement>('#activarUsuarioBtn-3')!.click();
    backend.expectOne({ method: 'PATCH', url: '/api/v1/usuarios/3/activar' }).flush({ ...carla, activo: true });
    recargar();
    expect(html.querySelector('#avisoUsuarios')!.textContent).toContain('Carla quedó activo de nuevo');
  }));

  it('ordenar por una columna vuelve a la primera página', fakeAsync(() => {
    crear('ADMINISTRADOR');
    fixture.componentInstance.page.set(2);
    html.querySelector<HTMLButtonElement>('thead button[aria-label="Ordenar por Correo"]')!.click();
    fixture.detectChanges();
    tick(300);
    const req = backend.expectOne(esLista);
    expect(req.request.params.get('sort')).toBe('correo,asc');
    expect(req.request.params.get('page')).toBe('0');
    req.flush(pagina([ana]));
  }));

  it('muestra el error si la lista no carga', fakeAsync(() => {
    TestBed.inject(SesionStore).iniciar({
      token: 't', tipo: 'Bearer', expiraEnSegundos: 1800,
      usuario: { id: 1, nombre: 'Ana', correo: 'ana@a.com', rol: 'LECTOR', empresaId: 1, empresaNombre: 'Demo' },
    });
    fixture = TestBed.createComponent(UsuariosComponent);
    html = fixture.nativeElement;
    fixture.detectChanges();
    tick(300);
    backend.expectOne(esLista).error(new ProgressEvent('error'), { status: 0 });
    fixture.detectChanges();
    expect(html.textContent).toContain('Sin conexión');
  }));
});
