import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { SesionStore } from '../../../core/services/sesion.store';
import { Diagrama } from '../../../models/diagrama.model';
import { PermisoEstructura } from '../../../models/pool.model';
import { RolAcceso } from '../../../models/usuario.model';
import { ProcesoEditorPageComponent } from './proceso-editor-page.component';

describe('ProcesoEditorPageComponent: estructura en su pestaña (HU-21, HU-22, HU-24)', () => {
  let fixture: ComponentFixture<ProcesoEditorPageComponent>;
  let backend: HttpTestingController;
  let html: HTMLElement;

  const diagrama = (permiso: PermisoEstructura = 'ADMINISTRADOR_Y_EDITOR', propio = true): Diagrama => ({
    proceso: {
      id: 9, nombre: 'Compras', descripcion: null, categoria: 'Compras', estado: 'BORRADOR', activo: true, version: 0,
      propio, creadoEn: '', creadoPor: '', modificadoEn: '', modificadoPor: '',
    },
    pools: [{
      id: 1, procesoId: 9, nombre: 'Facimus', tipo: 'PROPIETARIO', cajaNegra: false, orden: 0, permisoEstructura: permiso,
      lanes: [
        { id: 10, poolId: 1, rolProcesoId: 1, nombre: 'Empleado', orden: 0 },
        { id: 11, poolId: 1, rolProcesoId: 2, nombre: 'Jefe', orden: 1 },
        { id: 12, poolId: 1, rolProcesoId: 3, nombre: 'Talento humano', orden: 2 },
      ],
    }],
    nodos: [], arcos: [], mensajes: [], advertencias: [],
  });

  const crear = (rol: RolAcceso, d: Diagrama = diagrama(), rolesFallan = false) => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [ProcesoEditorPageComponent],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '9' })) } },
      ],
    });
    TestBed.inject(SesionStore).iniciar({
      token: 't', tipo: 'Bearer', expiraEnSegundos: 1800,
      usuario: { id: 1, nombre: 'Ana', correo: 'a@a.com', rol, empresaId: 1, empresaNombre: 'Demo' },
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProcesoEditorPageComponent);
    html = fixture.nativeElement;
    fixture.detectChanges();

    // forkJoin: el diagrama y el catálogo de roles salen a la vez
    const roles = backend.expectOne((r) => r.url === '/api/v1/roles-proceso');
    const diagramaReq = backend.expectOne('/api/v1/procesos/9/diagrama');
    if (rolesFallan) {
      roles.flush({ title: 'Error' }, { status: 500, statusText: 'Server Error' });
    } else {
      roles.flush({ content: [{ id: 1, nombre: 'Empleado' }, { id: 4, nombre: 'Analista' }], page: 0, size: 200, totalElements: 2, totalPages: 1 });
    }
    diagramaReq.flush(d);
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#pestanaEstructura')?.click();
    fixture.detectChanges();
  };

  const recargarDiagrama = (d: Diagrama = diagrama()) => {
    backend.expectOne('/api/v1/procesos/9/diagrama').flush(d);
    fixture.detectChanges();
  };

  afterEach(() => backend.verify());

  it('carga el diagrama aunque falle el catálogo de roles', () => {
    crear('EDITOR', diagrama(), true);
    expect(html.textContent).toContain('Diagrama: Compras');
    expect(html.querySelector('#estructuraDiagrama')!.textContent).toContain('Talento humano');
  });

  it('agrega un pool y recarga el diagrama (las advertencias quedan al día)', () => {
    crear('EDITOR');
    html.querySelector<HTMLButtonElement>('#agregarPoolBtn')!.click();
    fixture.detectChanges();
    const nombre = html.querySelector<HTMLInputElement>('#poolNombre')!;
    nombre.value = 'Proveedor';
    nombre.dispatchEvent(new Event('input'));
    html.querySelector<HTMLButtonElement>('#guardarPoolBtn')!.click();

    const req = backend.expectOne({ method: 'POST', url: '/api/v1/procesos/9/pools' });
    expect(req.request.body).toEqual({ nombre: 'Proveedor', tipo: 'CLIENTE', cajaNegra: false });
    req.flush({});
    recargarDiagrama();

    expect(html.querySelector('#avisoEditor')!.textContent).toContain('Pool "Proveedor" agregado.');
    expect(html.querySelector('#poolForm')).toBeNull();
  });

  it('subir una lane envía el orden completo del pool', () => {
    crear('ADMINISTRADOR');
    html.querySelector<HTMLButtonElement>('button[aria-label="Subir Talento humano"]')!.click();
    const req = backend.expectOne({ method: 'PUT', url: '/api/v1/pools/1/lanes/orden' });
    expect(req.request.body).toEqual({ laneIds: [10, 12, 11] });
    req.flush([]);
    recargarDiagrama();
  });

  it('agrega una lane con un rol libre del catálogo', () => {
    crear('EDITOR');
    html.querySelector<HTMLButtonElement>('#agregarLaneBtn-1')!.click();
    fixture.detectChanges();
    const opciones = [...html.querySelectorAll('#laneRol option')].map((o) => o.textContent!.trim());
    expect(opciones).toEqual(['Elija un rol…', 'Analista']);
  });

  it('eliminar una lane con elementos muestra el motivo de la API', () => {
    crear('EDITOR');
    html.querySelector<HTMLButtonElement>('#eliminarLaneBtn-10')!.click();
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#confirmarEliminarBtn')!.click();
    backend.expectOne({ method: 'DELETE', url: '/api/v1/lanes/10' }).flush(
      { title: 'Regla de negocio', status: 409, detail: "La lane 'Empleado' contiene 3 elementos: reasígnelos a otra lane antes de eliminarla" },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();
    expect(html.textContent).toContain("La lane 'Empleado' contiene 3 elementos");
  });

  it('el administrador cambia el permiso de estructura del pool propietario', () => {
    crear('ADMINISTRADOR');
    html.querySelector<HTMLButtonElement>('#editarPoolBtn-1')!.click();
    fixture.detectChanges();
    const select = html.querySelector<HTMLSelectElement>('#permisoEstructura')!;
    select.value = 'SOLO_ADMINISTRADOR';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#aplicarPermisoBtn')!.click();
    const req = backend.expectOne({ method: 'PUT', url: '/api/v1/pools/1/permisos' });
    expect(req.request.body).toEqual({ permiso: 'SOLO_ADMINISTRADOR' });
    req.flush({});
    recargarDiagrama(diagrama('SOLO_ADMINISTRADOR'));
    expect(html.querySelector('#avisoEditor')!.textContent).toContain('Permisos de estructura actualizados.');
  });

  it('HU-24: con "solo administrador" el editor ve la estructura sin acciones', () => {
    crear('EDITOR', diagrama('SOLO_ADMINISTRADOR'));
    expect(html.querySelector('#estructuraRestringidaMsg')).not.toBeNull();
    expect(html.querySelector('#agregarPoolBtn')).toBeNull();
    expect(html.querySelector('#eliminarLaneBtn-10')).toBeNull();
  });

  it('el lector y los procesos compartidos se ven en solo lectura', () => {
    crear('LECTOR');
    expect(html.querySelector('#soloLecturaBadge')).not.toBeNull();
    expect(html.querySelector('#agregarPoolBtn')).toBeNull();
  });

  it('un proceso que no existe muestra el 404', () => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [ProcesoEditorPageComponent],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '9' })) } },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProcesoEditorPageComponent);
    html = fixture.nativeElement;
    fixture.detectChanges();
    backend.expectOne((r) => r.url === '/api/v1/roles-proceso').flush({ content: [], page: 0, size: 200, totalElements: 0, totalPages: 0 });
    backend.expectOne('/api/v1/procesos/9/diagrama').flush(
      { title: 'Recurso no encontrado', status: 404, detail: 'No existe el proceso 9' },
      { status: 404, statusText: 'Not Found' },
    );
    fixture.detectChanges();
    expect(html.querySelector('#diagramaNoEncontrado')!.textContent).toContain('El proceso no existe');
  });
});
