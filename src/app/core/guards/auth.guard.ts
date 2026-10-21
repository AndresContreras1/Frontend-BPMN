import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { RolAcceso } from '../../models/usuario.model';
import { SesionStore } from '../services/sesion.store';

/** Las páginas internas exigen sesión iniciada. */
export const authGuard: CanActivateFn = () => {
  const sesion = inject(SesionStore);
  return sesion.autenticado() ? true : inject(Router).createUrlTree(['/login']);
};

/** Las páginas de solo invitados (login, registro) redirigen si ya hay sesión. */
export const invitadoGuard: CanActivateFn = () => {
  const sesion = inject(SesionStore);
  return sesion.autenticado() ? inject(Router).createUrlTree(['/procesos']) : true;
};

/** Restringe una ruta a ciertos roles de acceso (route.data.roles). La API aplica el mismo permiso. */
export const rolGuard: CanActivateFn = (route) => {
  const roles = (route.data['roles'] ?? []) as RolAcceso[];
  const rol = inject(SesionStore).rol();
  return rol !== null && roles.includes(rol) ? true : inject(Router).createUrlTree(['/procesos']);
};
