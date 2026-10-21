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

/** Pruebas de la pestaña "Estructura" del editor: pools, lanes y permisos de estructura (HU-21, HU-22, HU-24). */
describe('ProcesoEditorPageComponent: estructura en su pestaña (HU-21, HU-22, HU-24)', () => {
  let fixture: ComponentFixture<ProcesoEditorPageComponent>;
  let backend: HttpTestingController;
  let html: HTMLElement;

  // Ayuda: crea un diagrama de ejemplo con un pool propietario y tres lanes; se puede cambiar el permiso de estructura
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

  // Ayuda: arma el editor para un rol. Se inicia sesión, se reemplaza el ActivatedRoute por uno con id=9,
  // se responden las dos peticiones iniciales (catálogo de roles y diagrama) y se abre la pestaña Estructura.
  // "rolesFallan" simula que el catálogo de roles responde con error.
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

  // Ayuda: responde la nueva carga del diagrama que el editor hace después de cada cambio
  const recargarDiagrama = (d: Diagrama = diagrama()) => {
    backend.expectOne('/api/v1/procesos/9/diagrama').flush(d);
    fixture.detectChanges();
  };

  // verify falla si quedó alguna petición HTTP sin responder
  afterEach(() => backend.verify());

  // Esperado: si el catálogo de roles falla, el diagrama se muestra igual con sus lanes.
  it('carga el diagrama aunque falle el catálogo de roles', () => {
    crear('EDITOR', diagrama(), true);
    expect(html.textContent).toContain('Diagrama: Compras');
    expect(html.querySelector('#estructuraDiagrama')!.textContent).toContain('Talento humano');
  });

  // Escenario: el editor abre el formulario de pool, escribe un nombre y guarda.
  // Esperado: POST con los datos del pool, recarga del diagrama, aviso de éxito y formulario cerrado.
  it('agrega un pool y recarga el diagrama (las advertencias quedan al día)', () => {
    crear('EDITOR');
    html.querySelector<HTMLButtonElement>('#agregarPoolBtn')!.click();
    fixture.detectChanges();
    const nombre = html.querySelector<HTMLInputElement>('#poolNombre')!;
    nombre.value = 'Proveedor';
    nombre.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#guardarPoolBtn')!.click();

    const req = backend.expectOne({ method: 'POST', url: '/api/v1/procesos/9/pools' });
    expect(req.request.body).toEqual({ nombre: 'Proveedor', tipo: 'CLIENTE', cajaNegra: false });
    req.flush({});
    recargarDiagrama();

    expect(html.querySelector('#avisoEditor')!.textContent).toContain('Pool "Proveedor" agregado.');
    expect(html.querySelector('#poolForm')).toBeNull();
  });

  // Esperado: subir "Talento humano" (de 3.ª a 2.ª posición) envía el orden completo de ids: [10, 12, 11].
  it('subir una lane envía el orden completo del pool', () => {
    crear('ADMINISTRADOR');
    html.querySelector<HTMLButtonElement>('button[aria-label="Subir Talento humano"]')!.click();
    const req = backend.expectOne({ method: 'PUT', url: '/api/v1/pools/1/lanes/orden' });
    expect(req.request.body).toEqual({ laneIds: [10, 12, 11] });
    req.flush([]);
    recargarDiagrama();
  });

  // Esperado: el select de roles ofrece solo los roles que el pool todavía no usa (aquí, "Analista").
  it('agrega una lane con un rol libre del catálogo', () => {
    crear('EDITOR');
    html.querySelector<HTMLButtonElement>('#agregarLaneBtn-1')!.click();
    fixture.detectChanges();
    const opciones = [...html.querySelectorAll('#laneRol option')].map((o) => o.textContent!.trim());
    expect(opciones).toEqual(['Elija un rol…', 'Analista']);
  });

  // Escenario: se confirma eliminar una lane y el servidor responde 409 porque contiene elementos.
  // Esperado: se muestra el motivo del servidor.
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

  // Esperado: el administrador edita el pool, elige "solo administrador" y aplica; se envía el PUT de permisos,
  // se recarga el diagrama y se muestra el aviso.
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

  // Esperado: si el permiso es solo administrador, un editor ve el aviso de restricción y no tiene botones de estructura.
  it('HU-24: con "solo administrador" el editor ve la estructura sin acciones', () => {
    crear('EDITOR', diagrama('SOLO_ADMINISTRADOR'));
    expect(html.querySelector('#estructuraRestringidaMsg')).not.toBeNull();
    expect(html.querySelector('#agregarPoolBtn')).toBeNull();
    expect(html.querySelector('#eliminarLaneBtn-10')).toBeNull();
  });

  // Esperado: el lector ve la insignia de solo lectura y ningún botón para agregar.
  it('el lector y los procesos compartidos se ven en solo lectura', () => {
    crear('LECTOR');
    expect(html.querySelector('#soloLecturaBadge')).not.toBeNull();
    expect(html.querySelector('#agregarPoolBtn')).toBeNull();
  });

  // Escenario: el diagrama responde 404.
  // Esperado: se muestra el mensaje de que el proceso no existe. Aquí no se usa "crear" porque ese caso es distinto.
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
