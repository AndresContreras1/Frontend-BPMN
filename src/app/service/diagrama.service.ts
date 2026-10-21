import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Advertencia, Diagrama } from '../models/diagrama.model';

/** HU-07: el diagrama completo del proceso y su validación de coherencia. */
@Injectable({ providedIn: 'root' })
export class DiagramaService {
  /** Cliente HTTP de Angular para hacer las peticiones a la API. */
  private readonly http = inject(HttpClient);
  /** URL base de los procesos; el diagrama cuelga de cada proceso. */
  private readonly url = `${environment.apiUrl}/procesos`;

  /** Trae el diagrama completo (pools, nodos, arcos, mensajes y advertencias) de un proceso. */
  obtener(procesoId: number): Observable<Diagrama> {
    return this.http.get<Diagrama>(`${this.url}/${procesoId}/diagrama`);
  }

  /** Pide al servidor que valide el proceso y devuelve la lista de advertencias. */
  validar(procesoId: number): Observable<Advertencia[]> {
    return this.http.get<Advertencia[]>(`${this.url}/${procesoId}/validacion`);
  }
}
