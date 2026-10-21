import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { PermisoEstructura, Pool, PoolRequest } from '../models/pool.model';
import { RolProcesoResumen } from '../models/rol-proceso.model';

/** HU-21 y HU-24: pools del proceso y permisos de estructura. */
@Injectable({ providedIn: 'root' })
export class PoolService {
  /** Cliente HTTP de Angular para hacer las peticiones a la API. */
  private readonly http = inject(HttpClient);
  /** URL base de la API (viene del archivo environment). */
  private readonly url = environment.apiUrl;

  /** Lista los pools de un proceso. */
  listar(procesoId: number): Observable<Pool[]> {
    return this.http.get<Pool[]>(`${this.url}/procesos/${procesoId}/pools`);
  }

  /** Trae un pool por su id. */
  obtener(id: number): Observable<Pool> {
    return this.http.get<Pool>(`${this.url}/pools/${id}`);
  }

  /** Crea un pool dentro del proceso. */
  crear(procesoId: number, pool: PoolRequest): Observable<Pool> {
    return this.http.post<Pool>(`${this.url}/procesos/${procesoId}/pools`, pool);
  }

  /** Modifica un pool existente. */
  actualizar(id: number, pool: PoolRequest): Observable<Pool> {
    return this.http.put<Pool>(`${this.url}/pools/${id}`, pool);
  }

  /** Elimina el pool. */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/pools/${id}`);
  }

  /** Solo administrador y solo en el pool de la empresa propietaria. */
  cambiarPermisos(id: number, permiso: PermisoEstructura): Observable<Pool> {
    return this.http.put<Pool>(`${this.url}/pools/${id}/permisos`, { permiso });
  }

  /** Roles de proceso que todavía se pueden usar como lane en este pool (los que aún no tiene). */
  rolesDisponibles(id: number): Observable<RolProcesoResumen[]> {
    return this.http.get<RolProcesoResumen[]>(`${this.url}/pools/${id}/roles-disponibles`);
  }
}
