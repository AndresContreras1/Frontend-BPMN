import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SesionStore } from '../services/sesion.store';

/** Las páginas internas exigen sesión iniciada; se recuerda la URL para volver después del login. */
export const authGuard: CanActivateFn = (_route, state) => {
  // Se pide el store de sesión para saber si hay un usuario con token
  const sesion = inject(SesionStore);
  if (sesion.autenticado()) {
    // Hay sesión: se deja pasar a la ruta
    return true;
  }
  // No hay sesión: se redirige al login guardando la URL pedida en returnUrl para volver luego
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Las páginas de solo invitados (bienvenida, login, registro) llevan al inicio de la empresa si ya hay sesión. */
export const invitadoGuard: CanActivateFn = () => {
  const sesion = inject(SesionStore);
  // Si ya inició sesión no tiene sentido ver el login: se manda al inicio; si no, puede entrar
  return sesion.autenticado() ? inject(Router).createUrlTree(['/inicio']) : true;
};
