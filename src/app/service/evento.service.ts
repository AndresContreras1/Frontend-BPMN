import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Impacto } from '../models/diagrama.model';
import { EventoRequest, Nodo } from '../models/nodo.model';

/** Eventos de inicio y de fin; viven en un pool y, opcionalmente, en una lane. */
@Injectable({ providedIn: 'root' })
export class EventoService {
  /** Cliente HTTP de Angular para hacer las peticiones a la API. */
  private readonly http = inject(HttpClient);
  /** URL base de la API (viene del archivo environment). */
  private readonly url = environment.apiUrl;

  /** Crea un evento dentro del pool indicado. */
  crear(poolId: number, evento: EventoRequest): Observable<Nodo> {
    return this.http.post<Nodo>(`${this.url}/pools/${poolId}/eventos`, evento);
  }

  /** Modifica un evento existente. */
  actualizar(id: number, evento: EventoRequest): Observable<Nodo> {
    return this.http.put<Nodo>(`${this.url}/eventos/${id}`, evento);
  }

  /** Consulta qué pasaría si se elimina el evento, sin borrarlo. */
  impacto(id: number): Observable<Impacto> {
    return this.http.get<Impacto>(`${this.url}/eventos/${id}/impacto`);
  }

  /** Elimina el evento. */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/eventos/${id}`);
  }
}
