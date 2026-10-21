import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { SesionStore } from '../../core/services/sesion.store';
import { Proceso } from '../../models/proceso.model';
import { RolAcceso } from '../../models/usuario.model';
import { ProcesosComponent } from './procesos.component';

/**
 * Pruebas de la lista de procesos: filtros, permisos por rol, eliminación y vistas (HU-06, HU-07).
 * Usa fakeAsync porque la búsqueda espera 300 ms (debounce); tick(300) avanza ese tiempo simulado.
 */
describe('ProcesosComponent (HU-06, HU-07)', () => {
  let fixture: ComponentFixture<ProcesosComponent>;
  let backend: HttpTestingController;
  let html: HTMLElement;

  // Ayuda: crea un proceso de ejemplo; "extra" cambia los campos que interesen
  const proceso = (id: number, nombre: string, extra: Partial<Proceso> = {}): Proceso => ({
    id, nombre, descripcion: null, categoria: 'Talento humano', estado: 'BORRADOR', activo: true, version: 0, propio: true,
    creadoEn: '2026-10-01T10:00:00Z', creadoPor: 'a@a.com', modificadoEn: '2026-10-02T10:00:00Z', modificadoPor: 'a@a.com',
    ...extra,
  });
  const vacaciones = proceso(1, 'Solicitud de vacaciones', { estado: 'PUBLICADO' });
  const compras = proceso(2, 'Aprobación de compras', { categoria: 'Compras' });

  // Ayuda: arma una respuesta paginada como la del backend
  const pagina = (content: Proceso[]) => ({ content, page: 0, size: 10, totalElements: content.length, totalPages: 1 });
  // Filtro para expectOne: identifica la petición GET que carga la lista de procesos
  const esLista = (r: { method: string; url: string }) => r.method === 'GET' && r.url === '/api/v1/procesos';

  // Ayuda: inicia sesión con el rol dado, abre la página y responde las categorías y la primera lista.
  // Devuelve la petición de la lista para poder revisar sus parámetros.
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

  // Ayuda: elige una opción en un select (cambia el value y lanza el evento "change")
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

  // verify falla si quedó alguna petición HTTP sin responder
  afterEach(() => backend.verify());

  // Esperado: la primera consulta pide solo activos ordenados por nombre, sin filtro de estado;
  // se dibujan 2 filas y el filtro de categorías se llena con las que devolvió el servidor.
  it('lista los procesos activos ordenados por nombre y llena el filtro de categorías', fakeAsync(() => {
    const params = crear('ADMINISTRADOR').request.params;
    expect(params.get('activo')).toBe('true');
    expect(params.get('sort')).toBe('nombre,asc');
    expect(params.has('estado')).toBeFalse();
    expect(html.querySelectorAll('tbody tr').length).toBe(2);
    expect(html.querySelector('#filtroCategoria')!.textContent).toContain('Compras');
  }));

  // Escenario: estando en la página 3 se escribe una búsqueda y se eligen estado y categoría.
  // Esperado: una sola consulta lleva los tres filtros y vuelve a la página 0; aparece el botón de limpiar filtros.
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

  // Esperado: al marcar "Ver eliminados" se consulta activo=false y los procesos eliminados no tienen editar ni eliminar.
  it('"Ver eliminados" consulta los inactivos y no ofrece editar ni eliminar', fakeAsync(() => {
    crear('ADMINISTRADOR');
    html.querySelector<HTMLInputElement>('#verEliminados')!.click();
    const params = siguienteConsulta([proceso(9, 'Control de calidad 2024', { activo: false })]);

    expect(params.get('activo')).toBe('false');
    expect(html.textContent).toContain('Eliminado');
    expect(html.querySelector('#editarProcesoBtn-9')).toBeNull();
    expect(html.querySelector('#eliminarProcesoBtn-9')).toBeNull();
  }));

  // Esperado: el lector no ve los botones de crear, editar ni eliminar.
  it('el lector solo consulta: sin crear, editar ni eliminar', fakeAsync(() => {
    crear('LECTOR');
    expect(html.querySelector('#nuevoProcesoBtn')).toBeNull();
    expect(html.querySelector('#editarProcesoBtn-1')).toBeNull();
    expect(html.querySelector('#eliminarProcesoBtn-1')).toBeNull();
  }));

  // Esperado: el editor ve crear y editar, pero no eliminar.
  it('el editor crea y edita, pero solo el administrador elimina', fakeAsync(() => {
    crear('EDITOR');
    expect(html.querySelector('#nuevoProcesoBtn')).not.toBeNull();
    expect(html.querySelector('#editarProcesoBtn-1')).not.toBeNull();
    expect(html.querySelector('#eliminarProcesoBtn-1')).toBeNull();
  }));

  // Esperado: eliminar abre un modal con el nombre; al confirmar se envía el DELETE, se recarga la lista y se muestra el aviso.
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

  // Escenario: el servidor responde 403 al eliminar.
  // Esperado: se muestra el mensaje y la lista conserva sus 2 filas.
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

  // Esperado: al cambiar a tarjetas desaparece la tabla, aparece una tarjeta por proceso, la preferencia
  // queda en localStorage y eliminar desde una tarjeta abre el mismo modal.
  it('la vista de tarjetas muestra los mismos procesos y se recuerda en el navegador', fakeAsync(() => {
    crear('ADMINISTRADOR');
    html.querySelector<HTMLButtonElement>('#vistaTarjetasBtn')!.click();
    fixture.detectChanges();

    expect(html.querySelector('table')).toBeNull();
    expect(html.querySelectorAll('app-proceso-tarjeta').length).toBe(2);
    expect(html.querySelector('#eliminarProcesoBtn-2')).not.toBeNull();
    expect(localStorage.getItem('preferencia.vistaProcesos')).toBe('tarjetas');

    html.querySelector<HTMLButtonElement>('#eliminarProcesoBtn-2')!.click();
    fixture.detectChanges();
    expect(html.querySelector('.modal')!.textContent).toContain('Aprobación de compras');
  }));

  // Escenario: la página se abre con ?estado=PUBLICADO&eliminados=true en la URL (viene de un indicador del inicio).
  // Esperado: esos filtros se aplican desde la primera consulta.
  it('aplica los filtros que llegan en la URL desde los indicadores del inicio', fakeAsync(() => {
    // Se reinicia el módulo de pruebas para configurar de nuevo con un ActivatedRoute falso que trae esos parámetros
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [ProcesosComponent],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ estado: 'PUBLICADO', eliminados: 'true' }) } } },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    const params = crear('LECTOR').request.params;

    expect(params.get('estado')).toBe('PUBLICADO');
    expect(params.get('activo')).toBe('false');
    expect(html.querySelector<HTMLInputElement>('#verEliminados')!.checked).toBeTrue();
  }));
});
