import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Arco, ArcoRequest } from '../models/arco.model';
import { Impacto } from '../models/diagrama.model';

/** HU-11 a HU-13: flujos de secuencia entre elementos del mismo pool. */
@Injectable({ providedIn: 'root' })
export class ArcoService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;

  crear(arco: ArcoRequest): Observable<Arco> {
    return this.http.post<Arco>(`${this.url}/arcos`, arco);
  }

  actualizar(id: number, arco: ArcoRequest): Observable<Arco> {
    return this.http.put<Arco>(`${this.url}/arcos/${id}`, arco);
  }

  impacto(id: number): Observable<Impacto> {
    return this.http.get<Impacto>(`${this.url}/arcos/${id}/impacto`);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/arcos/${id}`);
  }
}
