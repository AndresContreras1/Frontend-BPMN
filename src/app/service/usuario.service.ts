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
  /** Cliente HTTP de Angular para hacer las peticiones a la API. */
  private readonly http = inject(HttpClient);
  /** URL base de los endpoints de usuarios. */
  private readonly url = `${environment.apiUrl}/usuarios`;

  /** Lista los usuarios filtrando por nombre, con paginación. */
  listar(nombre: string, paginacion: Paginacion): Observable<PageResponse<Usuario>> {
    return this.http.get<PageResponse<Usuario>>(this.url, { params: parametros(paginacion, { nombre }) });
  }

  /** Trae un usuario por su id. */
  obtener(id: number): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.url}/${id}`);
  }

  /** Crea un usuario nuevo en la empresa. */
  crear(usuario: UsuarioRequest): Observable<Usuario> {
    return this.http.post<Usuario>(this.url, usuario);
  }

  /** Cambia el rol de acceso de un usuario. */
  cambiarRol(id: number, rol: RolAcceso): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.url}/${id}/rol`, { rol });
  }

  /** Desactivar no borra: el usuario conserva su historial y sus procesos siguen siendo de la empresa. */
  cambiarEstado(id: number, activo: boolean): Observable<Usuario> {
    return this.http.put<Usuario>(`${this.url}/${id}/estado`, { activo });
  }
}
