import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Arco, ArcoRequest } from '../models/arco.model';
import { Impacto } from '../models/diagrama.model';

/** HU-11 a HU-13: flujos de secuencia entre elementos del mismo pool. */
@Injectable({ providedIn: 'root' })
export class ArcoService {
  /** Cliente HTTP de Angular para hacer las peticiones a la API. */
  private readonly http = inject(HttpClient);
  /** URL base de la API (viene del archivo environment). */
  private readonly url = environment.apiUrl;

  /** Crea un arco entre dos nodos. */
  crear(arco: ArcoRequest): Observable<Arco> {
    return this.http.post<Arco>(`${this.url}/arcos`, arco);
  }

  /** Modifica un arco existente. */
  actualizar(id: number, arco: ArcoRequest): Observable<Arco> {
    return this.http.put<Arco>(`${this.url}/arcos/${id}`, arco);
  }

  /** Consulta qué pasaría si se elimina el arco, sin borrarlo. */
  impacto(id: number): Observable<Impacto> {
    return this.http.get<Impacto>(`${this.url}/arcos/${id}/impacto`);
  }

  /** Elimina el arco. */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/arcos/${id}`);
  }
}
