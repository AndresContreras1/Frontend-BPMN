import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SesionStore } from '../../core/services/sesion.store';
import { Proceso } from '../../models/proceso.model';
import { RolAcceso } from '../../models/usuario.model';
import { InicioComponent } from './inicio.component';

/** Pruebas de la página de inicio (panel con indicadores, procesos recientes y accesos rápidos) (HU-07). */
describe('InicioComponent (HU-07)', () => {
  let fixture: ComponentFixture<InicioComponent>;
  let backend: HttpTestingController;
  let html: HTMLElement;

  // Proceso de ejemplo para la lista de recientes
  const vacaciones: Proceso = {
    id: 1, nombre: 'Solicitud de vacaciones', descripcion: null, categoria: 'Talento humano', estado: 'PUBLICADO',
    activo: true, version: 1, propio: true, creadoEn: '2026-10-01T10:00:00Z', creadoPor: 'a@a.com',
    modificadoEn: '2026-10-02T10:00:00Z', modificadoPor: 'a@a.com',
  };
  // Ayuda: arma una respuesta paginada como la del backend
  const pagina = <T>(content: T[], totalElements = content.length) =>
    ({ content, page: 0, size: 1, totalElements, totalPages: 1 });

  // Ayuda: inicia sesión con el rol indicado y crea la página (esto dispara las consultas al backend)
  const abrir = (rol: RolAcceso) => {
    TestBed.inject(SesionStore).iniciar({
      token: 't', tipo: 'Bearer', expiraEnSegundos: 1800,
      usuario: { id: 1, nombre: 'Laura Gómez', correo: 'l@a.com', rol, empresaId: 1, empresaNombre: 'Facimus' },
    });
    fixture = TestBed.createComponent(InicioComponent);
    html = fixture.nativeElement;
    fixture.detectChanges();
  };

  // Ayuda: responde con flush las cuatro consultas que hace la página (resumen, recientes, usuarios y roles)
  const responder = () => {
    backend.expectOne('/api/v1/procesos/resumen')
      .flush({ total: 3, borradores: 2, publicados: 1, eliminados: 4, compartidosConmigo: 5 });
    const recientes = backend.expectOne((r) => r.url === '/api/v1/procesos');
    expect(recientes.request.params.get('sort')).toBe('modificadoEn,desc');
    expect(recientes.request.params.get('size')).toBe('5');
    recientes.flush(pagina([vacaciones]));
    backend.expectOne((r) => r.url === '/api/v1/usuarios').flush(pagina([], 6));
    backend.expectOne((r) => r.url === '/api/v1/roles-proceso').flush(pagina([], 7));
    fixture.detectChanges();
  };

  // Ayuda: lee el número que muestra el indicador con esa clave
  const valor = (clave: string) => html.querySelector(`#indicador-${clave} .valor-indicador`)?.textContent?.trim();

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [InicioComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
  });

  // verify falla si quedó alguna petición HTTP sin responder
  afterEach(() => backend.verify());

  // Escenario: un administrador abre el inicio.
  // Esperado: primero se ve "cargando"; al responder las consultas aparecen saludo, indicadores,
  // totales de usuarios y roles, un proceso reciente y el porcentaje de publicados.
  it('pide las cuatro consultas a la vez y muestra los indicadores de la empresa', () => {
    abrir('ADMINISTRADOR');
    expect(html.querySelector('#inicioCargando')).not.toBeNull();

    responder();

    expect(html.querySelector('h1')?.textContent).toContain('Hola, Laura');
    expect(valor('total')).toBe('3');
    expect(valor('borradores')).toBe('2');
    expect(valor('publicados')).toBe('1');
    expect(valor('compartidos')).toBe('5');
    expect(valor('eliminados')).toBe('4');
    expect(html.querySelector('#inicioUsuarios')?.textContent).toBe('6');
    expect(html.querySelector('#inicioRoles')?.textContent).toBe('7');
    expect(html.querySelectorAll('.proceso-reciente').length).toBe(1);
    expect(html.textContent).toContain('33 %');
  });

  // Esperado: un lector no ve el botón de nuevo proceso ni la opción de invitar usuarios.
  it('los accesos dependen del rol: el lector no crea procesos ni invita usuarios', () => {
    abrir('LECTOR');
    responder();

    expect(html.querySelector('#inicioNuevoProcesoBtn')).toBeNull();
    expect(html.textContent).not.toContain('Invitar a un usuario');
  });

  // Escenario: la primera consulta responde 500.
  // Esperado: las demás se cancelan, se muestra el error y el botón de reintentar vuelve a cargar todo.
  it('si falla una consulta muestra el error y deja reintentar', () => {
    abrir('EDITOR');
    backend.expectOne('/api/v1/procesos/resumen').flush(null, { status: 500, statusText: 'Error' });
    // forkJoin cancela las demás consultas cuando una falla
    expect(backend.match(() => true).every((r) => r.cancelled)).toBeTrue();
    fixture.detectChanges();

    expect(html.querySelector('#inicioError')?.textContent).toContain('Error del servidor');

    html.querySelector<HTMLButtonElement>('#inicioError button')?.click();
    responder();
    expect(valor('total')).toBe('3');
  });
});
