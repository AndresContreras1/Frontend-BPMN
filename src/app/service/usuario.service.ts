import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { parametros } from '../core/services/parametros';
import { PageResponse, Paginacion } from '../models/page-response.model';
import { RolAcceso, Usuario, UsuarioRequest } from '../models/usuario.model';

/** HU-02: usuarios de la empresa. Listar es para todos; crear, cambiar rol y (des)activar, solo administrador. */
@Injectable({ providedIn: 'root' })
export class UsuarioService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/usuarios`;

  listar(nombre: string, paginacion: Paginacion): Observable<PageResponse<Usuario>> {
    return this.http.get<PageResponse<Usuario>>(this.url, { params: parametros(paginacion, { nombre }) });
  }

  obtener(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.url}/${id}`);
  }

  crear(usuario: UsuarioRequest): Observable<Usuario> {
    return this.http.post<Usuario>(this.url, usuario);
  }

  cambiarRol(id: number, rol: RolAcceso): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.url}/${id}/rol`, { rol });
  }

  /** Desactivar no borra: el usuario conserva su historial y sus procesos siguen siendo de la empresa. */
  cambiarEstado(id: number, activo: boolean): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.url}/${id}/estado`, { activo });
  }
}
