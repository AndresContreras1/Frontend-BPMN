import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Impacto } from '../models/diagrama.model';
import { EventoRequest, Nodo } from '../models/nodo.model';

/** Eventos de inicio y de fin; viven en un pool y, opcionalmente, en una lane. */
@Injectable({ providedIn: 'root' })
export class EventoService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;

  crear(poolId: number, evento: EventoRequest): Observable<Nodo> {
    return this.http.post<Nodo>(`${this.url}/pools/${poolId}/eventos`, evento);
  }

  actualizar(id: number, evento: EventoRequest): Observable<Nodo> {
    return this.http.put<Nodo>(`${this.url}/eventos/${id}`, evento);
  }

  impacto(id: number): Observable<Impacto> {
    return this.http.get<Impacto>(`${this.url}/eventos/${id}/impacto`);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/eventos/${id}`);
  }
}
