import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { SesionStore } from '../services/sesion.store';

/**
 * El 401 se maneja en un solo lugar: si el token venció o el usuario fue desactivado,
 * se cierra la sesión y se vuelve al login. El intento de login fallido no redirige.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const sesion = inject(SesionStore);
  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.endsWith('/auth/login')) {
        sesion.cerrar();
        router.navigate(['/login'], { queryParams: { expirada: true } });
      }
      return throwError(() => err);
    }),
  );
};
