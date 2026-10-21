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
  /** Cliente HTTP de Angular para hacer las peticiones a la API. */
  private readonly http = inject(HttpClient);
  /** URL base de la API (viene del archivo environment). */
  private readonly url = environment.apiUrl;

  /** Crea un Message Throw: un evento que envía un mensaje a otro pool. */
  crearThrow(procesoId: number, mensaje: MensajeThrowRequest): Observable<MensajeGuardado> {
    return this.http.post<MensajeGuardado>(`${this.url}/procesos/${procesoId}/mensajes/throw`, mensaje);
  }

  /** Crea una notificación a un sistema externo (caja negra). */
  crearEnvioExterno(procesoId: number, mensaje: EnvioExternoRequest): Observable<MensajeGuardado> {
    return this.http.post<MensajeGuardado>(`${this.url}/procesos/${procesoId}/mensajes/externos`, mensaje);
  }

  /** Crea un Message Catch: un evento que espera recibir un mensaje. */
  crearCatch(procesoId: number, mensaje: MensajeCatchRequest): Observable<MensajeGuardado> {
    return this.http.post<MensajeGuardado>(`${this.url}/procesos/${procesoId}/mensajes/catch`, mensaje);
  }

  /** Edita un mensaje; los campos en null no cambian. */
  actualizar(id: number, mensaje: MensajeActualizacionRequest): Observable<MensajeGuardado> {
    return this.http.put<MensajeGuardado>(`${this.url}/mensajes/${id}`, mensaje);
  }

  /** Define la clave de correlación que une el mensaje con el caso correcto (HU-28). */
  definirCorrelacion(id: number, correlacion: CorrelacionRequest): Observable<MensajeGuardado> {
    return this.http.put<MensajeGuardado>(`${this.url}/mensajes/${id}/correlacion`, correlacion);
  }

  /** Consulta qué pasaría si se elimina el mensaje, sin borrarlo. */
  impacto(id: number): Observable<Impacto> {
    return this.http.get<Impacto>(`${this.url}/mensajes/${id}/impacto`);
  }

  /** Elimina el mensaje. */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/mensajes/${id}`);
  }
}
