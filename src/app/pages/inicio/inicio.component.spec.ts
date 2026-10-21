import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SesionStore } from '../../core/services/sesion.store';
import { Proceso } from '../../models/proceso.model';
import { RolAcceso } from '../../models/usuario.model';
import { InicioComponent } from './inicio.component';

describe('InicioComponent (HU-07)', () => {
  let fixture: ComponentFixture<InicioComponent>;
  let backend: HttpTestingController;
  let html: HTMLElement;

  const vacaciones: Proceso = {
    id: 1, nombre: 'Solicitud de vacaciones', descripcion: null, categoria: 'Talento humano', estado: 'PUBLICADO',
    activo: true, version: 1, propio: true, creadoEn: '2026-10-01T10:00:00Z', creadoPor: 'a@a.com',
    modificadoEn: '2026-10-02T10:00:00Z', modificadoPor: 'a@a.com',
  };
  const pagina = <T>(content: T[], totalElements = content.length) =>
    ({ content, page: 0, size: 1, totalElements, totalPages: 1 });

  const abrir = (rol: RolAcceso) => {
    TestBed.inject(SesionStore).iniciar({
      token: 't', tipo: 'Bearer', expiraEnSegundos: 1800,
      usuario: { id: 1, nombre: 'Laura Gómez', correo: 'l@a.com', rol, empresaId: 1, empresaNombre: 'Facimus' },
    });
    fixture = TestBed.createComponent(InicioComponent);
    html = fixture.nativeElement;
    fixture.detectChanges();
  };

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

  const valor = (clave: string) => html.querySelector(`#indicador-${clave} .valor-indicador`)?.textContent?.trim();

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [InicioComponent],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

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

  it('los accesos dependen del rol: el lector no crea procesos ni invita usuarios', () => {
    abrir('LECTOR');
    responder();

    expect(html.querySelector('#inicioNuevoProcesoBtn')).toBeNull();
    expect(html.textContent).not.toContain('Invitar a un usuario');
  });

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
