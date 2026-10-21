import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { SesionStore } from '../../core/services/sesion.store';
import { Proceso } from '../../models/proceso.model';
import { RolAcceso } from '../../models/usuario.model';
import { ProcesoDetalleComponent } from './proceso-detalle.component';

describe('ProcesoDetalleComponent (HU-04 a HU-07, HU-23)', () => {
  let fixture: ComponentFixture<ProcesoDetalleComponent>;
  let backend: HttpTestingController;
  let router: Router;
  let html: HTMLElement;

  const base: Proceso = {
    id: 5, nombre: 'Contratación', descripcion: null, categoria: 'Talento humano', estado: 'BORRADOR', activo: true,
    version: 1, propio: true, creadoEn: '', creadoPor: 'a@a.com', modificadoEn: '', modificadoPor: 'a@a.com',
  };
  const vacio = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 };

  const crear = (rol: RolAcceso, proceso: Proceso | null) => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [ProcesoDetalleComponent],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '5' })) } },
      ],
    });
    TestBed.inject(SesionStore).iniciar({
      token: 't', tipo: 'Bearer', expiraEnSegundos: 1800,
      usuario: { id: 1, nombre: 'Ana', correo: 'a@a.com', rol, empresaId: 1, empresaNombre: 'Demo' },
    });
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(ProcesoDetalleComponent);
    html = fixture.nativeElement;
    fixture.detectChanges();

    const req = backend.expectOne('/api/v1/procesos/5');
    if (proceso) {
      req.flush(proceso);
    } else {
      req.flush({ title: 'Recurso no encontrado', status: 404, detail: 'No existe el proceso 5' }, { status: 404, statusText: 'Not Found' });
    }
    fixture.detectChanges();
    // Paneles hijos: diagrama (siempre), historial y compartición (solo si el proceso es propio)
    for (const r of backend.match('/api/v1/procesos/5/diagrama')) {
      r.flush({ proceso, pools: [], nodos: [], arcos: [], mensajes: [], advertencias: [] });
    }
    for (const r of backend.match((r) => r.url === '/api/v1/procesos/5/historial')) r.flush(vacio);
    for (const r of backend.match('/api/v1/procesos/5/comparticion')) r.flush({ compartido: false, empresas: [] });
    fixture.detectChanges();
  };

  afterEach(() => backend.verify());

  it('HU-07: al abrir el proceso se ve su diagrama, también si es compartido por otra empresa', () => {
    crear('LECTOR', { ...base, propio: false });
    expect(html.querySelector('app-diagrama-vista')).not.toBeNull();
    expect(html.querySelector('#diagramaVacio')).not.toBeNull();
  });

  it('el administrador ve editar, publicar, eliminar, historial y compartir', () => {
    crear('ADMINISTRADOR', base);
    expect(html.querySelector('#editarProcesoBtn')).not.toBeNull();
    expect(html.querySelector('#publicarBtn')).not.toBeNull();
    expect(html.querySelector('#eliminarProcesoBtn')).not.toBeNull();
    expect(html.querySelector('app-historial-tabla')).not.toBeNull();
    expect(html.querySelector('#compartidoSwitch')).not.toBeNull();
  });

  it('el lector solo consulta: ve el historial, pero sin acciones ni edición de la compartición', () => {
    crear('LECTOR', base);
    expect(html.querySelector('#editarProcesoBtn')).toBeNull();
    expect(html.querySelector('#publicarBtn')).toBeNull();
    expect(html.querySelector('#eliminarProcesoBtn')).toBeNull();
    expect(html.querySelector('app-historial-tabla')).not.toBeNull();
    expect(html.querySelector('#compartidoSwitch')).toBeNull();
  });

  it('un proceso compartido por otra empresa: solo lectura, sin historial ni compartición', () => {
    crear('ADMINISTRADOR', { ...base, propio: false });
    expect(html.querySelector('#procesoCompartidoMsg')).not.toBeNull();
    expect(html.querySelector('#editarProcesoBtn')).toBeNull();
    expect(html.querySelector('app-historial-tabla')).toBeNull();
    expect(html.querySelector('app-compartir-panel')).toBeNull();
  });

  it('un proceso eliminado se consulta sin acciones', () => {
    crear('ADMINISTRADOR', { ...base, activo: false });
    expect(html.querySelector('#procesoEliminadoMsg')).not.toBeNull();
    expect(html.querySelector('#publicarBtn')).toBeNull();
    expect(html.querySelector('#eliminarProcesoBtn')).toBeNull();
  });

  it('publicar un diagrama incoherente muestra los motivos y no cambia el estado', () => {
    crear('EDITOR', base);
    html.querySelector<HTMLButtonElement>('#publicarBtn')!.click();
    const req = backend.expectOne({ method: 'PUT', url: '/api/v1/procesos/5' });
    expect(req.request.body.estado).toBe('PUBLICADO');
    expect(req.request.body.version).toBe(1);
    req.flush(
      { title: 'Regla de negocio', status: 409, detail: 'No se puede publicar: el diagrama tiene errores de coherencia',
        detalles: ['El diagrama todavía no tiene elementos'] },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();
    expect(html.textContent).toContain('El diagrama todavía no tiene elementos');
    expect(html.querySelector('#publicarBtn')).not.toBeNull();
  });

  it('publicar con éxito cambia el estado y recarga el historial', () => {
    crear('EDITOR', base);
    html.querySelector<HTMLButtonElement>('#publicarBtn')!.click();
    backend.expectOne({ method: 'PUT', url: '/api/v1/procesos/5' }).flush({ ...base, estado: 'PUBLICADO', version: 2 });
    fixture.detectChanges();

    expect(html.querySelector('#avisoProceso')!.textContent).toContain('publicado');
    expect(html.querySelector('#borradorBtn')).not.toBeNull();
    backend.expectOne((r) => r.url === '/api/v1/procesos/5/historial').flush(vacio);
  });

  it('eliminar confirma y vuelve a la lista con el aviso', () => {
    crear('ADMINISTRADOR', base);
    html.querySelector<HTMLButtonElement>('#eliminarProcesoBtn')!.click();
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#confirmarEliminarBtn')!.click();
    backend.expectOne({ method: 'DELETE', url: '/api/v1/procesos/5' }).flush(null, { status: 204, statusText: 'No Content' });
    expect(router.navigate).toHaveBeenCalledWith(['/procesos'], { queryParams: { eliminado: 'Contratación' } });
  });

  it('un proceso de otra empresa (404) muestra que no existe', () => {
    crear('ADMINISTRADOR', null);
    expect(html.querySelector('#procesoNoEncontrado')!.textContent).toContain('El proceso no existe');
  });
});
