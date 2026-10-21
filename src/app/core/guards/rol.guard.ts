import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { RolAcceso } from '../../models/usuario.model';
import { SesionStore } from '../services/sesion.store';

/**
 * Restringe una ruta a ciertos roles de acceso (route.data.roles). Es solo para la navegación:
 * la API aplica el mismo permiso con @PreAuthorize y responde 403 si alguien lo salta.
 */
export const rolGuard: CanActivateFn = (route) => {
  // Roles permitidos que la ruta declara en su propiedad data; si no declara ninguno, la lista queda vacía
  const roles = (route.data['roles'] ?? []) as RolAcceso[];
  // Rol del usuario actual (null si no hay sesión)
  const rol = inject(SesionStore).rol();
  // Pasa solo si hay rol y está en la lista; si no, se devuelve al inicio
  return rol !== null && roles.includes(rol) ? true : inject(Router).createUrlTree(['/inicio']);
};
