import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Impacto } from '../models/diagrama.model';
import { ActividadRequest, Nodo } from '../models/nodo.model';

/** HU-08 a HU-10: actividades del diagrama. */
@Injectable({ providedIn: 'root' })
export class ActividadService {
  /** Cliente HTTP de Angular para hacer las peticiones a la API. */
  private readonly http = inject(HttpClient);
  /** URL base de la API (viene del archivo environment). */
  private readonly url = environment.apiUrl;

  /** Crea una actividad dentro de la lane indicada. */
  crear(laneId: number, actividad: ActividadRequest): Observable<Nodo> {
    return this.http.post<Nodo>(`${this.url}/lanes/${laneId}/actividades`, actividad);
  }

  /** laneId es obligatorio al editar: cambiarla cambia el responsable (HU-09). */
  actualizar(id: number, actividad: ActividadRequest): Observable<Nodo> {
    return this.http.put<Nodo>(`${this.url}/actividades/${id}`, actividad);
  }

  /** Consulta qué pasaría si se elimina la actividad (arcos afectados y advertencias), sin borrarla. */
  impacto(id: number): Observable<Impacto> {
    return this.http.get<Impacto>(`${this.url}/actividades/${id}/impacto`);
  }

  /** Elimina la actividad. */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/actividades/${id}`);
  }
}
