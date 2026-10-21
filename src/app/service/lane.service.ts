import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Lane } from '../models/lane.model';

/** HU-22: lanes de un pool; cada una corresponde a un rol de proceso. */
@Injectable({ providedIn: 'root' })
export class LaneService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;

  listar(poolId: number): Observable<Lane[]> {
    return this.http.get<Lane[]>(`${this.url}/pools/${poolId}/lanes`);
  }

  crear(poolId: number, rolProcesoId: number): Observable<Lane> {
    return this.http.post<Lane>(`${this.url}/pools/${poolId}/lanes`, { rolProcesoId });
  }

  /** Nuevo orden de arriba hacia abajo: deben ir todas las lanes del pool, una vez cada una. */
  reordenar(poolId: number, laneIds: number[]): Observable<Lane[]> {
    return this.http.put<Lane[]>(`${this.url}/pools/${poolId}/lanes/orden`, { laneIds });
  }

  actualizar(id: number, rolProcesoId: number): Observable<Lane> {
    return this.http.put<Lane>(`${this.url}/lanes/${id}`, { rolProcesoId });
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/lanes/${id}`);
  }
}
