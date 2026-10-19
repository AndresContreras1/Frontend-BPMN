import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { LoginRequest, LoginResponse, UsuarioResumen } from '../models/usuario.model';

/** HU-03: inicio y cierre de sesión. Solo hace peticiones; el estado lo guarda SesionStore. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/auth`;

  login(credenciales: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.url}/login`, credenciales);
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.url}/logout`, null);
  }

  /** Usuario del token: refresca el rol si un administrador lo cambió. */
  yo(): Observable<UsuarioResumen> {
    return this.http.get<UsuarioResumen>(`${this.url}/yo`);
  }
}
