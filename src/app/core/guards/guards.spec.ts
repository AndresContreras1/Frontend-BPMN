import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';

import { RolAcceso } from '../../models/usuario.model';
import { SesionStore } from '../services/sesion.store';
import { authGuard, invitadoGuard } from './auth.guard';
import { rolGuard } from './rol.guard';

describe('Guards de navegación', () => {
  let router: Router;

  const entrar = (rol: RolAcceso) =>
    TestBed.inject(SesionStore).iniciar({
      token: 't', tipo: 'Bearer', expiraEnSegundos: 1800,
      usuario: { id: 1, nombre: 'A', correo: 'a@a.com', rol, empresaId: 1, empresaNombre: 'E' },
    });

  const ejecutar = (guard: typeof authGuard, data: Record<string, unknown> = {}, url = '/empresa') =>
    TestBed.runInInjectionContext(() =>
      guard({ data } as unknown as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    router = TestBed.inject(Router);
  });

  it('authGuard sin sesión manda al login recordando la URL', () => {
    const resultado = ejecutar(authGuard, {}, '/procesos/7') as UrlTree;
    expect(router.serializeUrl(resultado)).toBe('/login?returnUrl=%2Fprocesos%2F7');
  });

  it('authGuard con sesión deja pasar', () => {
    entrar('LECTOR');
    expect(ejecutar(authGuard)).toBeTrue();
  });

  it('invitadoGuard con sesión manda al inicio', () => {
    entrar('EDITOR');
    expect(router.serializeUrl(ejecutar(invitadoGuard) as UrlTree)).toBe('/');
  });

  it('invitadoGuard sin sesión deja ver el login', () => {
    expect(ejecutar(invitadoGuard)).toBeTrue();
  });

  it('rolGuard solo deja pasar a los roles de la ruta', () => {
    entrar('EDITOR');
    expect(router.serializeUrl(ejecutar(rolGuard, { roles: ['ADMINISTRADOR'] }) as UrlTree)).toBe('/');
    expect(ejecutar(rolGuard, { roles: ['ADMINISTRADOR', 'EDITOR'] })).toBeTrue();
  });

  it('rolGuard sin sesión no deja pasar', () => {
    expect(ejecutar(rolGuard, { roles: ['ADMINISTRADOR'] }) instanceof UrlTree).toBeTrue();
  });
});
