import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { PermisoEstructura, Pool, PoolRequest } from '../models/pool.model';
import { RolProcesoResumen } from '../models/rol-proceso.model';

/** HU-21 y HU-24: pools del proceso y permisos de estructura. */
@Injectable({ providedIn: 'root' })
export class PoolService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;

  listar(procesoId: number): Observable<Pool[]> {
    return this.http.get<Pool[]>(`${this.url}/procesos/${procesoId}/pools`);
  }

  obtener(id: number): Observable<Pool> {
    return this.http.get<Pool>(`${this.url}/pools/${id}`);
  }

  crear(procesoId: number, pool: PoolRequest): Observable<Pool> {
    return this.http.post<Pool>(`${this.url}/procesos/${procesoId}/pools`, pool);
  }

  actualizar(id: number, pool: PoolRequest): Observable<Pool> {
    return this.http.put<Pool>(`${this.url}/pools/${id}`, pool);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/pools/${id}`);
  }

  /** Solo administrador y solo en el pool de la empresa propietaria. */
  cambiarPermisos(id: number, permiso: PermisoEstructura): Observable<Pool> {
    return this.http.put<Pool>(`${this.url}/pools/${id}/permisos`, { permiso });
  }

  rolesDisponibles(id: number): Observable<RolProcesoResumen[]> {
    return this.http.get<RolProcesoResumen[]>(`${this.url}/pools/${id}/roles-disponibles`);
  }
}
