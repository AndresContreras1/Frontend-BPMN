import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';

import { SesionStore } from '../../core/services/sesion.store';
import { Proceso } from '../../models/proceso.model';
import { RolAcceso } from '../../models/usuario.model';
import { ProcesoDetalleComponent } from './proceso-detalle.component';

/** Pruebas de la página de detalle de un proceso: acciones según el rol, estado del proceso y paneles hijos (HU-04 a HU-07, HU-23). */
describe('ProcesoDetalleComponent (HU-04 a HU-07, HU-23)', () => {
  let fixture: ComponentFixture<ProcesoDetalleComponent>;
  let backend: HttpTestingController;
  let router: Router;
  let html: HTMLElement;

  // Proceso base: borrador, activo y propio de la empresa; las pruebas lo modifican con spread
  const base: Proceso = {
    id: 5, nombre: 'Contratación', descripcion: null, categoria: 'Talento humano', estado: 'BORRADOR', activo: true,
    version: 1, propio: true, creadoEn: '', creadoPor: 'a@a.com', modificadoEn: '', modificadoPor: 'a@a.com',
  };
  // Página vacía para responder el historial
  const vacio = { content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 };

  // Ayuda: arma toda la página para un rol y un proceso (null simula un 404).
  // Se inicia sesión con ese rol, el ActivatedRoute se reemplaza por uno falso con id=5 y el backend
  // simulado responde el proceso y las peticiones de los paneles hijos.
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

  // verify falla si quedó alguna petición HTTP sin responder
  afterEach(() => backend.verify());

  // Esperado: un lector que abre un proceso de otra empresa ve igualmente el diagrama.
  it('HU-07: al abrir el proceso se ve su diagrama, también si es compartido por otra empresa', () => {
    crear('LECTOR', { ...base, propio: false });
    expect(html.querySelector('app-diagrama-vista')).not.toBeNull();
    expect(html.querySelector('#diagramaVacio')).not.toBeNull();
  });

  // Esperado: el administrador dispone de todas las acciones y paneles.
  it('el administrador ve editar, publicar, eliminar, historial y compartir', () => {
    crear('ADMINISTRADOR', base);
    expect(html.querySelector('#editarProcesoBtn')).not.toBeNull();
    expect(html.querySelector('#publicarBtn')).not.toBeNull();
    expect(html.querySelector('#eliminarProcesoBtn')).not.toBeNull();
    expect(html.querySelector('app-historial-tabla')).not.toBeNull();
    expect(html.querySelector('#compartidoSwitch')).not.toBeNull();
  });

  // Esperado: el lector no ve botones de acción ni el interruptor de compartir, pero sí el historial.
  it('el lector solo consulta: ve el historial, pero sin acciones ni edición de la compartición', () => {
    crear('LECTOR', base);
    expect(html.querySelector('#editarProcesoBtn')).toBeNull();
    expect(html.querySelector('#publicarBtn')).toBeNull();
    expect(html.querySelector('#eliminarProcesoBtn')).toBeNull();
    expect(html.querySelector('app-historial-tabla')).not.toBeNull();
    expect(html.querySelector('#compartidoSwitch')).toBeNull();
  });

  // Esperado: si el proceso no es propio (propio=false) hay mensaje de compartido y ninguna acción ni panel de gestión.
  it('un proceso compartido por otra empresa: solo lectura, sin historial ni compartición', () => {
    crear('ADMINISTRADOR', { ...base, propio: false });
    expect(html.querySelector('#procesoCompartidoMsg')).not.toBeNull();
    expect(html.querySelector('#editarProcesoBtn')).toBeNull();
    expect(html.querySelector('app-historial-tabla')).toBeNull();
    expect(html.querySelector('app-compartir-panel')).toBeNull();
  });

  // Esperado: con activo=false se muestra el mensaje de eliminado y desaparecen publicar y eliminar.
  it('un proceso eliminado se consulta sin acciones', () => {
    crear('ADMINISTRADOR', { ...base, activo: false });
    expect(html.querySelector('#procesoEliminadoMsg')).not.toBeNull();
    expect(html.querySelector('#publicarBtn')).toBeNull();
    expect(html.querySelector('#eliminarProcesoBtn')).toBeNull();
  });

  // Escenario: el editor pulsa publicar y el servidor responde 409 con los motivos.
  // Esperado: el PUT envía estado PUBLICADO con la versión actual; se muestran los motivos y el proceso sigue en borrador.
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

  // Esperado: si el PUT tiene éxito aparece el aviso, cambia el botón a "volver a borrador" y se recarga el historial.
  it('publicar con éxito cambia el estado y recarga el historial', () => {
    crear('EDITOR', base);
    html.querySelector<HTMLButtonElement>('#publicarBtn')!.click();
    backend.expectOne({ method: 'PUT', url: '/api/v1/procesos/5' }).flush({ ...base, estado: 'PUBLICADO', version: 2 });
    fixture.detectChanges();

    expect(html.querySelector('#avisoProceso')!.textContent).toContain('publicado');
    expect(html.querySelector('#borradorBtn')).not.toBeNull();
    backend.expectOne((r) => r.url === '/api/v1/procesos/5/historial').flush(vacio);
  });

  // Escenario: eliminar pide confirmación; al confirmar se hace el DELETE.
  // Esperado: respuesta 204 y navegación a la lista con el nombre del proceso eliminado.
  it('eliminar confirma y vuelve a la lista con el aviso', () => {
    crear('ADMINISTRADOR', base);
    html.querySelector<HTMLButtonElement>('#eliminarProcesoBtn')!.click();
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#confirmarEliminarBtn')!.click();
    backend.expectOne({ method: 'DELETE', url: '/api/v1/procesos/5' }).flush(null, { status: 204, statusText: 'No Content' });
    expect(router.navigate).toHaveBeenCalledWith(['/procesos'], { queryParams: { eliminado: 'Contratación' } });
  });

  // Esperado: si el servidor responde 404, se muestra "El proceso no existe".
  it('un proceso de otra empresa (404) muestra que no existe', () => {
    crear('ADMINISTRADOR', null);
    expect(html.querySelector('#procesoNoEncontrado')!.textContent).toContain('El proceso no existe');
  });
});
