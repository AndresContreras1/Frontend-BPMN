import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../../../environments/environment';
import { TokenService } from '../services/token.service';

/** Agrega Authorization: Bearer a las peticiones hacia la API (nunca a otros dominios). */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // Token guardado al iniciar sesión (puede no existir)
  const token = inject(TokenService).obtener();
  // Sin token, o si la URL no es de nuestra API, la petición sigue igual para no filtrar el token a terceros
  if (!token || !req.url.startsWith(environment.apiUrl)) {
    return next(req);
  }
  // Las peticiones son inmutables, por eso se clona con la cabecera de autorización añadida
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
