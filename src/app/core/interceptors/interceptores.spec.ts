import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import { CargaService } from '../services/carga.service';
import { SesionStore } from '../services/sesion.store';
import { TokenService } from '../services/token.service';
import { authInterceptor } from './auth.interceptor';
import { cargaInterceptor } from './carga.interceptor';
import { errorInterceptor } from './error.interceptor';

describe('Interceptores HTTP', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let tokens: TokenService;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    localStorage.clear();
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor, cargaInterceptor])),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    tokens = TestBed.inject(TokenService);
  });

  afterEach(() => backend.verify());

  it('la barra de carga se ve mientras haya peticiones en curso, terminen bien o con error', () => {
    const carga = TestBed.inject(CargaService);
    http.get('/api/v1/procesos').subscribe();
    http.get('/api/v1/usuarios').subscribe({ error: () => undefined });
    expect(carga.cargando()).toBeTrue();

    backend.expectOne('/api/v1/procesos').flush([]);
    expect(carga.cargando()).toBeTrue();
    backend.expectOne('/api/v1/usuarios').flush(null, { status: 500, statusText: 'Error' });
    expect(carga.cargando()).toBeFalse();
  });

  it('agrega el Bearer a las peticiones de la API', () => {
    tokens.guardar('abc');
    http.get('/api/v1/procesos').subscribe();
    expect(backend.expectOne('/api/v1/procesos').request.headers.get('Authorization')).toBe('Bearer abc');
  });

  it('no envía el token a otros dominios', () => {
    tokens.guardar('abc');
    http.get('https://otro-sitio.com/datos').subscribe();
    expect(backend.expectOne('https://otro-sitio.com/datos').request.headers.has('Authorization')).toBeFalse();
  });

  it('sin token no agrega el header', () => {
    http.get('/api/v1/procesos').subscribe();
    expect(backend.expectOne('/api/v1/procesos').request.headers.has('Authorization')).toBeFalse();
  });

  it('un 401 cierra la sesión y vuelve al login', () => {
    tokens.guardar('vencido');
    const sesion = TestBed.inject(SesionStore);
    let error: unknown;
    http.get('/api/v1/procesos').subscribe({ error: (e) => (error = e) });

    backend.expectOne('/api/v1/procesos').flush({ title: 'No autenticado' }, { status: 401, statusText: 'Unauthorized' });

    expect(error).toBeTruthy();
    expect(tokens.obtener()).toBeNull();
    expect(sesion.autenticado()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { queryParams: { expirada: true } });
  });

  it('un login fallido no redirige', () => {
    http.post('/api/v1/auth/login', {}).subscribe({ error: () => undefined });
    backend.expectOne('/api/v1/auth/login').flush({ title: 'Credenciales inválidas' }, { status: 401, statusText: 'Unauthorized' });
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('otros errores pasan al componente sin cerrar la sesión', () => {
    tokens.guardar('abc');
    http.get('/api/v1/procesos/9').subscribe({ error: () => undefined });
    backend.expectOne('/api/v1/procesos/9').flush({ title: 'No encontrado' }, { status: 404, statusText: 'Not Found' });
    expect(tokens.obtener()).toBe('abc');
  });
});
