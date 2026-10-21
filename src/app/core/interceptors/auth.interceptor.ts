import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { TokenService } from '../services/token.service';

/** Agrega Authorization: Bearer a las peticiones hacia la API (nunca a otros dominios). */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(TokenService).obtener();
  if (!token || !req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
