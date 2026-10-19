import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SesionStore } from '../../core/services/sesion.store';
import { Proceso } from '../../models/proceso.model';
import { RolAcceso } from '../../models/usuario.model';
import { ProcesosComponent } from './procesos.component';

describe('ProcesosComponent (HU-06, HU-07)', () => {
  let fixture: ComponentFixture<ProcesosComponent>;
  let backend: HttpTestingController;
  let html: HTMLElement;

  const proceso = (id: number, nombre: string, extra: Partial<Proceso> = {}): Proceso => ({
    id, nombre, descripcion: null, categoria: 'Talento humano', estado: 'BORRADOR', activo: true, version: 0, propio: true,
    creadoEn: '2026-10-01T10:00:00Z', creadoPor: 'a@a.com', modificadoEn: '2026-10-02T10:00:00Z', modificadoPor: 'a@a.com',
    ...extra,
  });
  const vacaciones = proceso(1, 'Solicitud de vacaciones', { estado: 'PUBLICADO' });
  const compras = proceso(2, 'Aprobación de compras', { categoria: 'Compras' });

  const pagina = (content: Proceso[]) => ({ content, page: 0, size: 10, totalElements: content.length, totalPages: 1 });
  const esLista = (r: { method: string; url: string }) => r.method === 'GET' && r.url === '/api/v1/procesos';

  const crear = (rol: RolAcceso): TestRequest => {
    TestBed.inject(SesionStore).iniciar({
      token: 't', tipo: 'Bearer', expiraEnSegundos: 1800,
      usuario: { id: 1, nombre: 'Ana', correo: 'a@a.com', rol, empresaId: 1, empresaNombre: 'Demo' },
    });
    fixture = TestBed.createComponent(ProcesosComponent);
    html = fixture.nativeElement;
    fixture.detectChanges();
    backend.expectOne('/api/v1/procesos/categorias').flush(['Compras', 'Talento humano']);
    tick(300);
    const req = backend.expectOne(esLista);
    req.flush(pagina([compras, vacaciones]));
    fixture.detectChanges();
    return req;
  };

  /** Responde la siguiente consulta de la lista y devuelve sus parámetros. */
  const siguienteConsulta = (content: Proceso[] = []) => {
    fixture.detectChanges();
    tick(300);
    const req = backend.expectOne(esLista);
    req.flush(pagina(content));
    fixture.detectChanges();
    return req.request.params;
  };

  const cambiarSelect = (id: string, valor: string) => {
    const select = html.querySelector<HTMLSelectElement>(`#${id}`)!;
    select.value = valor;
    select.dispatchEvent(new Event('change'));
  };

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [ProcesosComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('lista los procesos activos ordenados por nombre y llena el filtro de categorías', fakeAsync(() => {
    const params = crear('ADMINISTRADOR').request.params;
    expect(params.get('activo')).toBe('true');
    expect(params.get('sort')).toBe('nombre,asc');
    expect(params.has('estado')).toBeFalse();
    expect(html.querySelectorAll('tbody tr').length).toBe(2);
    expect(html.querySelector('#filtroCategoria')!.textContent).toContain('Compras');
  }));

  it('combina búsqueda, estado y categoría y vuelve a la primera página', fakeAsync(() => {
    crear('EDITOR');
    fixture.componentInstance.page.set(3);
    const buscar = html.querySelector<HTMLInputElement>('#buscarProceso')!;
    buscar.value = 'vaca';
    buscar.dispatchEvent(new Event('input'));
    cambiarSelect('filtroEstado', 'PUBLICADO');
    cambiarSelect('filtroCategoria', 'Talento humano');

    const params = siguienteConsulta([vacaciones]);
    expect(params.get('nombre')).toBe('vaca');
    expect(params.get('estado')).toBe('PUBLICADO');
    expect(params.get('categoria')).toBe('Talento humano');
    expect(params.get('page')).toBe('0');
    expect(html.querySelector('#limpiarFiltrosBtn')).not.toBeNull();
  }));

  it('"Ver eliminados" consulta los inactivos y no ofrece editar ni eliminar', fakeAsync(() => {
    crear('ADMINISTRADOR');
    html.querySelector<HTMLInputElement>('#verEliminados')!.click();
    const params = siguienteConsulta([proceso(9, 'Control de calidad 2024', { activo: false })]);

    expect(params.get('activo')).toBe('false');
    expect(html.textContent).toContain('Eliminado');
    expect(html.querySelector('#editarProcesoBtn-9')).toBeNull();
    expect(html.querySelector('#eliminarProcesoBtn-9')).toBeNull();
  }));

  it('el lector solo consulta: sin crear, editar ni eliminar', fakeAsync(() => {
    crear('LECTOR');
    expect(html.querySelector('#nuevoProcesoBtn')).toBeNull();
    expect(html.querySelector('#editarProcesoBtn-1')).toBeNull();
    expect(html.querySelector('#eliminarProcesoBtn-1')).toBeNull();
  }));

  it('el editor crea y edita, pero solo el administrador elimina', fakeAsync(() => {
    crear('EDITOR');
    expect(html.querySelector('#nuevoProcesoBtn')).not.toBeNull();
    expect(html.querySelector('#editarProcesoBtn-1')).not.toBeNull();
    expect(html.querySelector('#eliminarProcesoBtn-1')).toBeNull();
  }));

  it('eliminar pide confirmación, llama a la API y recarga', fakeAsync(() => {
    crear('ADMINISTRADOR');
    html.querySelector<HTMLButtonElement>('#eliminarProcesoBtn-2')!.click();
    fixture.detectChanges();
    expect(html.querySelector('.modal')!.textContent).toContain('Aprobación de compras');

    html.querySelector<HTMLButtonElement>('#confirmarEliminarBtn')!.click();
    backend.expectOne({ method: 'DELETE', url: '/api/v1/procesos/2' }).flush(null, { status: 204, statusText: 'No Content' });
    siguienteConsulta([vacaciones]);

    expect(html.querySelector('#avisoProcesos')!.textContent).toContain('quedó eliminado');
  }));

  it('un 403 al eliminar se muestra sin perder la lista', fakeAsync(() => {
    crear('ADMINISTRADOR');
    html.querySelector<HTMLButtonElement>('#eliminarProcesoBtn-2')!.click();
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#confirmarEliminarBtn')!.click();
    backend.expectOne({ method: 'DELETE', url: '/api/v1/procesos/2' }).flush(
      { title: 'Sin permisos', status: 403, detail: 'Su rol no permite realizar esta operación' },
      { status: 403, statusText: 'Forbidden' },
    );
    fixture.detectChanges();
    expect(html.textContent).toContain('Su rol no permite realizar esta operación');
    expect(html.querySelectorAll('tbody tr').length).toBe(2);
  }));
});
