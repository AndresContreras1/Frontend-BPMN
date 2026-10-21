import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { RolAcceso } from '../../models/usuario.model';
import { SesionStore } from '../services/sesion.store';
import { authGuard, invitadoGuard } from './auth.guard';
import { rolGuard } from './rol.guard';

/** Pruebas de los guards de rutas: decidir si se deja entrar o se redirige según la sesión y el rol. */
describe('Guards de navegación', () => {
  let router: Router;

  // Ayuda: inicia sesión con el rol indicado
  const entrar = (rol: RolAcceso) =>
    TestBed.inject(SesionStore).iniciar({
      token: 't', tipo: 'Bearer', expiraEnSegundos: 1800,
      usuario: { id: 1, nombre: 'A', correo: 'a@a.com', rol, empresaId: 1, empresaNombre: 'E' },
    });

  // Ayuda: ejecuta un guard funcional. Los guards usan inject(), así que deben correr dentro de un
  // contexto de inyección (runInInjectionContext). La ruta y el estado se simulan con objetos mínimos.
  const ejecutar = (guard: typeof authGuard, data: Record<string, unknown> = {}, url = '/empresa') =>
    TestBed.runInInjectionContext(() =>
      guard({ data } as unknown as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );

  // Preparar: sesión limpia y un router vacío para poder serializar las redirecciones
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    router = TestBed.inject(Router);
  });

  // Sin sesión: redirige a /login guardando la URL pedida en returnUrl (codificada).
  it('authGuard sin sesión manda al login recordando la URL', () => {
    const resultado = ejecutar(authGuard, {}, '/procesos/7') as UrlTree;
    expect(router.serializeUrl(resultado)).toBe('/login?returnUrl=%2Fprocesos%2F7');
  });

  // Con sesión: devuelve true y la navegación continúa.
  it('authGuard con sesión deja pasar', () => {
    entrar('LECTOR');
    expect(ejecutar(authGuard)).toBeTrue();
  });

  // Con sesión no tiene sentido ver login/registro: va al inicio.
  it('invitadoGuard con sesión manda al inicio', () => {
    entrar('EDITOR');
    expect(router.serializeUrl(ejecutar(invitadoGuard) as UrlTree)).toBe('/inicio');
  });

  // Sin sesión puede ver las páginas públicas.
  it('invitadoGuard sin sesión deja ver el login', () => {
    expect(ejecutar(invitadoGuard)).toBeTrue();
  });

  // Un editor no entra a una ruta solo de administrador (va a /inicio), pero sí si su rol está en la lista.
  it('rolGuard solo deja pasar a los roles de la ruta', () => {
    entrar('EDITOR');
    expect(router.serializeUrl(ejecutar(rolGuard, { roles: ['ADMINISTRADOR'] }) as UrlTree)).toBe('/inicio');
    expect(ejecutar(rolGuard, { roles: ['ADMINISTRADOR', 'EDITOR'] })).toBeTrue();
  });

  // Sin sesión tampoco pasa: se devuelve una redirección (UrlTree).
  it('rolGuard sin sesión no deja pasar', () => {
    expect(ejecutar(rolGuard, { roles: ['ADMINISTRADOR'] }) instanceof UrlTree).toBeTrue();
  });
});
