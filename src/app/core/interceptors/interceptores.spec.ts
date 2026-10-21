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

/** Pruebas de los interceptores HTTP: token Bearer, manejo de errores 401 e indicador de carga. */
describe('Interceptores HTTP', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let tokens: TokenService;
  // Router falso (spy) para comprobar a dónde se navega sin navegar de verdad
  let router: jasmine.SpyObj<Router>;

  // Preparar: HttpClient con los tres interceptores reales y un backend simulado
  beforeEach(() => {
    localStorage.clear();
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, errorInterceptor, cargaInterceptor])),
        provideHttpClientTesting(),
        // Se reemplaza el Router real por el espía
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    tokens = TestBed.inject(TokenService);
  });

  // verify falla si alguna petición quedó sin atender
  afterEach(() => backend.verify());

  // Escenario: dos peticiones simultáneas, una termina bien y otra con error 500.
  // Esperado: "cargando" sigue en true hasta que terminan las dos, sin importar cómo terminen.
  it('la barra de carga se ve mientras haya peticiones en curso, terminen bien o con error', () => {
    const carga = TestBed.inject(CargaService);
    http.get('/api/v1/procesos').subscribe();
    http.get('/api/v1/usuarios').subscribe({ error: () => undefined });
    expect(carga.cargando()).toBeTrue();

    // flush responde la petición pendiente; queda una, así que sigue cargando
    backend.expectOne('/api/v1/procesos').flush([]);
    expect(carga.cargando()).toBeTrue();
    backend.expectOne('/api/v1/usuarios').flush(null, { status: 500, statusText: 'Error' });
    expect(carga.cargando()).toBeFalse();
  });

  // Esperado: con token guardado, la petición a la API lleva "Authorization: Bearer abc".
  it('agrega el Bearer a las peticiones de la API', () => {
    tokens.guardar('abc');
    http.get('/api/v1/procesos').subscribe();
    expect(backend.expectOne('/api/v1/procesos').request.headers.get('Authorization')).toBe('Bearer abc');
  });

  // Esperado: a un dominio externo nunca se le envía el token (seguridad).
  it('no envía el token a otros dominios', () => {
    tokens.guardar('abc');
    http.get('https://otro-sitio.com/datos').subscribe();
    expect(backend.expectOne('https://otro-sitio.com/datos').request.headers.has('Authorization')).toBeFalse();
  });

  // Esperado: sin token no se agrega el header.
  it('sin token no agrega el header', () => {
    http.get('/api/v1/procesos').subscribe();
    expect(backend.expectOne('/api/v1/procesos').request.headers.has('Authorization')).toBeFalse();
  });

  // Escenario: el servidor responde 401 (token vencido).
  // Esperado: el error llega al suscriptor, se borra el token, se cierra la sesión y se navega al login.
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

  // Un 401 al hacer login significa credenciales malas, no sesión vencida: no debe redirigir.
  it('un login fallido no redirige', () => {
    http.post('/api/v1/auth/login', {}).subscribe({ error: () => undefined });
    backend.expectOne('/api/v1/auth/login').flush({ title: 'Credenciales inválidas' }, { status: 401, statusText: 'Unauthorized' });
    expect(router.navigate).not.toHaveBeenCalled();
  });

  // Un 404 u otro error distinto de 401 no toca la sesión: el token sigue guardado.
  it('otros errores pasan al componente sin cerrar la sesión', () => {
    tokens.guardar('abc');
    http.get('/api/v1/procesos/9').subscribe({ error: () => undefined });
    backend.expectOne('/api/v1/procesos/9').flush({ title: 'No encontrado' }, { status: 404, statusText: 'Not Found' });
    expect(tokens.obtener()).toBe('abc');
  });
});
