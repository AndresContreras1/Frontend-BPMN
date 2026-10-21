import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Lane } from '../models/lane.model';

/** HU-22: lanes de un pool; cada una corresponde a un rol de proceso. */
@Injectable({ providedIn: 'root' })
export class LaneService {
  /** Cliente HTTP de Angular para hacer las peticiones a la API. */
  private readonly http = inject(HttpClient);
  /** URL base de la API (viene del archivo environment). */
  private readonly url = environment.apiUrl;

  /** Lista las lanes de un pool. */
  listar(poolId: number): Observable<Lane[]> {
    return this.http.get<Lane[]>(`${this.url}/pools/${poolId}/lanes`);
  }

  /** Crea una lane en el pool a partir de un rol de proceso. */
  crear(poolId: number, rolProcesoId: number): Observable<Lane> {
    return this.http.post<Lane>(`${this.url}/pools/${poolId}/lanes`, { rolProcesoId });
  }

  /** Nuevo orden de arriba hacia abajo: deben ir todas las lanes del pool, una vez cada una. */
  reordenar(poolId: number, laneIds: number[]): Observable<Lane[]> {
    return this.http.put<Lane[]>(`${this.url}/pools/${poolId}/lanes/orden`, { laneIds });
  }

  /** Cambia el rol de proceso que representa una lane. */
  actualizar(id: number, rolProcesoId: number): Observable<Lane> {
    return this.http.put<Lane>(`${this.url}/lanes/${id}`, { rolProcesoId });
  }

  /** Elimina la lane. */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/lanes/${id}`);
  }
}
