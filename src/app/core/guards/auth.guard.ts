import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { SesionStore } from '../services/sesion.store';

/** Las páginas internas exigen sesión iniciada; se recuerda la URL para volver después del login. */
export const authGuard: CanActivateFn = (_route, state) => {
  const sesion = inject(SesionStore);
  if (sesion.autenticado()) {
    return true;
  }
  return inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

/** Las páginas de solo invitados (login, registro) redirigen al inicio si ya hay sesión. */
export const invitadoGuard: CanActivateFn = () => {
  const sesion = inject(SesionStore);
  return sesion.autenticado() ? inject(Router).createUrlTree(['/']) : true;
};
