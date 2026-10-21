import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SesionStore } from '../../core/services/sesion.store';
import { RolProceso } from '../../models/rol-proceso.model';
import { RolAcceso } from '../../models/usuario.model';
import { RolesProcesoComponent } from './roles-proceso.component';

describe('RolesProcesoComponent (HU-17 a HU-20)', () => {
  let fixture: ComponentFixture<RolesProcesoComponent>;
  let backend: HttpTestingController;
  let html: HTMLElement;

  const empleado: RolProceso = {
    id: 1, nombre: 'Empleado', descripcion: 'Radica', enUso: true, eliminable: false,
    procesos: [{ id: 10, nombre: 'Solicitud de vacaciones' }, { id: 11, nombre: 'Viáticos' }],
  };
  const auditor: RolProceso = { id: 2, nombre: 'Auditor', descripcion: null, enUso: false, eliminable: true, procesos: [] };
  const pagina = (content: RolProceso[]) => ({ content, page: 0, size: 10, totalElements: content.length, totalPages: 1 });
  const esLista = (r: { method: string; url: string }) => r.method === 'GET' && r.url === '/api/v1/roles-proceso';

  const crear = (rol: RolAcceso) => {
    TestBed.inject(SesionStore).iniciar({
      token: 't', tipo: 'Bearer', expiraEnSegundos: 1800,
      usuario: { id: 1, nombre: 'Ana', correo: 'a@a.com', rol, empresaId: 1, empresaNombre: 'Demo' },
    });
    fixture = TestBed.createComponent(RolesProcesoComponent);
    html = fixture.nativeElement;
    fixture.detectChanges();
    tick(300);
    backend.expectOne(esLista).flush(pagina([empleado, auditor]));
    fixture.detectChanges();
  };

  const recargar = (content: RolProceso[] = [empleado, auditor]) => {
    fixture.detectChanges();
    tick(300);
    backend.expectOne(esLista).flush(pagina(content));
    fixture.detectChanges();
  };

  const escribirNombre = (valor: string) => {
    const input = html.querySelector<HTMLInputElement>('#rolNombre')!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [RolesProcesoComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('muestra el uso y bloquea eliminar un rol asignado a lanes', fakeAsync(() => {
    crear('ADMINISTRADOR');
    expect(html.textContent).toContain('2 procesos');
    expect(html.querySelector<HTMLButtonElement>('#eliminarRolBtn-1')!.disabled).toBeTrue();
    expect(html.querySelector<HTMLButtonElement>('#eliminarRolBtn-2')!.disabled).toBeFalse();
    expect(html.querySelector('#eliminarRolBtn-1')!.getAttribute('title')).toContain('asignado a lanes');
  }));

  it('el editor y el lector consultan sin crear, editar ni eliminar', fakeAsync(() => {
    crear('EDITOR');
    expect(html.querySelector('#nuevoRolBtn')).toBeNull();
    expect(html.querySelector('#editarRolBtn-1')).toBeNull();
    expect(html.querySelector('#eliminarRolBtn-2')).toBeNull();
    expect(html.querySelector('#verUsoRolBtn-1')).not.toBeNull();
  }));

  it('crea un rol desde el formulario y recarga la lista', fakeAsync(() => {
    crear('ADMINISTRADOR');
    html.querySelector<HTMLButtonElement>('#nuevoRolBtn')!.click();
    fixture.detectChanges();
    escribirNombre('  Analista  ');
    html.querySelector<HTMLButtonElement>('#guardarRolBtn')!.click();

    const req = backend.expectOne({ method: 'POST', url: '/api/v1/roles-proceso' });
    expect(req.request.body).toEqual({ nombre: 'Analista', descripcion: null });
    req.flush({ ...auditor, id: 3, nombre: 'Analista' });
    recargar();

    expect(html.querySelector('#avisoRoles')!.textContent).toContain('Rol "Analista" creado.');
    expect(html.querySelector('#rolNombre')).toBeNull();
  }));

  it('nombre repetido: el formulario sigue abierto con el motivo', fakeAsync(() => {
    crear('ADMINISTRADOR');
    html.querySelector<HTMLButtonElement>('#nuevoRolBtn')!.click();
    fixture.detectChanges();
    escribirNombre('empleado');
    html.querySelector<HTMLButtonElement>('#guardarRolBtn')!.click();
    backend.expectOne({ method: 'POST', url: '/api/v1/roles-proceso' }).flush(
      { title: 'Regla de negocio', status: 409, detail: "Ya existe un rol de proceso llamado 'empleado' en la empresa" },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();
    expect(html.querySelector('#rolNombre')).not.toBeNull();
    expect(html.textContent).toContain('Ya existe un rol de proceso');
  }));

  it('edita un rol en uso y avisa que sus lanes cambian de nombre', fakeAsync(() => {
    crear('ADMINISTRADOR');
    html.querySelector<HTMLButtonElement>('#editarRolBtn-1')!.click();
    fixture.detectChanges();
    expect(html.querySelector<HTMLInputElement>('#rolNombre')!.value).toBe('Empleado');
    expect(html.textContent).toContain('Las lanes que usan este rol cambian de nombre');

    escribirNombre('Colaborador');
    html.querySelector<HTMLButtonElement>('#guardarRolBtn')!.click();
    const req = backend.expectOne({ method: 'PUT', url: '/api/v1/roles-proceso/1' });
    expect(req.request.body).toEqual({ nombre: 'Colaborador', descripcion: 'Radica' });
    req.flush({ ...empleado, nombre: 'Colaborador' });
    recargar();
  }));

  it('elimina un rol sin uso con confirmación', fakeAsync(() => {
    crear('ADMINISTRADOR');
    html.querySelector<HTMLButtonElement>('#eliminarRolBtn-2')!.click();
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#confirmarEliminarBtn')!.click();
    backend.expectOne({ method: 'DELETE', url: '/api/v1/roles-proceso/2' }).flush(null, { status: 204, statusText: 'No Content' });
    recargar([empleado]);
    expect(html.querySelector('#avisoRoles')!.textContent).toContain('Rol "Auditor" eliminado.');
  }));

  it('si la API rechaza la eliminación (rol que pasó a estar en uso) muestra los procesos', fakeAsync(() => {
    crear('ADMINISTRADOR');
    html.querySelector<HTMLButtonElement>('#eliminarRolBtn-2')!.click();
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#confirmarEliminarBtn')!.click();
    backend.expectOne({ method: 'DELETE', url: '/api/v1/roles-proceso/2' }).flush(
      { title: 'Regla de negocio', status: 409, detail: "El rol 'Auditor' está asignado a lanes", detalles: ['Control interno'] },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();
    expect(html.textContent).toContain('Control interno');
  }));

  it('el panel de uso lista los procesos y el historial del rol', fakeAsync(() => {
    crear('LECTOR');
    html.querySelector<HTMLButtonElement>('#verUsoRolBtn-1')!.click();
    fixture.detectChanges();
    backend.expectOne('/api/v1/roles-proceso/1/historial').flush([
      { id: 1, fecha: '2026-10-19T07:00:00Z', usuario: 'admin@demo.com', tipo: 'CREACION', elemento: 'ROL_PROCESO',
        elementoId: 1, detalle: "Rol de proceso 'Empleado' creado", advertencias: [] },
    ]);
    fixture.detectChanges();
    const panel = html.querySelector('#usoRol')!.textContent!;
    expect(panel).toContain('Solicitud de vacaciones');
    expect(panel).toContain('Viáticos');
    expect(panel).toContain("Rol de proceso 'Empleado' creado");
  }));
});
