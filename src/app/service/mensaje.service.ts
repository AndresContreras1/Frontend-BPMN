import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Impacto, MensajeGuardado } from '../models/diagrama.model';
import {
  CorrelacionRequest, EnvioExternoRequest, MensajeActualizacionRequest, MensajeCatchRequest, MensajeThrowRequest,
} from '../models/mensaje.model';

/** HU-25 a HU-28: flujos de mensaje entre pools y su correlación. */
@Injectable({ providedIn: 'root' })
export class MensajeService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;

  crearThrow(procesoId: number, mensaje: MensajeThrowRequest): Observable<MensajeGuardado> {
    return this.http.post<MensajeGuardado>(`${this.url}/procesos/${procesoId}/mensajes/throw`, mensaje);
  }

  crearEnvioExterno(procesoId: number, mensaje: EnvioExternoRequest): Observable<MensajeGuardado> {
    return this.http.post<MensajeGuardado>(`${this.url}/procesos/${procesoId}/mensajes/externos`, mensaje);
  }

  crearCatch(procesoId: number, mensaje: MensajeCatchRequest): Observable<MensajeGuardado> {
    return this.http.post<MensajeGuardado>(`${this.url}/procesos/${procesoId}/mensajes/catch`, mensaje);
  }

  actualizar(id: number, mensaje: MensajeActualizacionRequest): Observable<MensajeGuardado> {
    return this.http.put<MensajeGuardado>(`${this.url}/mensajes/${id}`, mensaje);
  }

  definirCorrelacion(id: number, correlacion: CorrelacionRequest): Observable<MensajeGuardado> {
    return this.http.put<MensajeGuardado>(`${this.url}/mensajes/${id}/correlacion`, correlacion);
  }

  impacto(id: number): Observable<Impacto> {
    return this.http.get<Impacto>(`${this.url}/mensajes/${id}/impacto`);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/mensajes/${id}`);
  }
}
