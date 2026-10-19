import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { RolAcceso } from '../../models/usuario.model';
import { SesionStore } from '../services/sesion.store';

/**
 * Restringe una ruta a ciertos roles de acceso (route.data.roles). Es solo para la navegación:
 * la API aplica el mismo permiso con @PreAuthorize y responde 403 si alguien lo salta.
 */
export const rolGuard: CanActivateFn = (route) => {
  const roles = (route.data['roles'] ?? []) as RolAcceso[];
  const rol = inject(SesionStore).rol();
  return rol !== null && roles.includes(rol) ? true : inject(Router).createUrlTree(['/']);
};
