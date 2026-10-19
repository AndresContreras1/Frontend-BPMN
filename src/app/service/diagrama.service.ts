import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Advertencia, Diagrama } from '../models/diagrama.model';

/** HU-07: el diagrama completo del proceso y su validación de coherencia. */
@Injectable({ providedIn: 'root' })
export class DiagramaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/procesos`;

  obtener(procesoId: number): Observable<Diagrama> {
    return this.http.get<Diagrama>(`${this.url}/${procesoId}/diagrama`);
  }

  validar(procesoId: number): Observable<Advertencia[]> {
    return this.http.get<Advertencia[]>(`${this.url}/${procesoId}/validacion`);
  }
}
