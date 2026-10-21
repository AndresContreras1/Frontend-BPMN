import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { GatewayGuardado, Impacto } from '../models/diagrama.model';
import { GatewayRequest } from '../models/nodo.model';

/** HU-14 a HU-16: gateways; al guardar la API devuelve las advertencias de sus ramas. */
@Injectable({ providedIn: 'root' })
export class GatewayService {
  /** Cliente HTTP de Angular para hacer las peticiones a la API. */
  private readonly http = inject(HttpClient);
  /** URL base de la API (viene del archivo environment). */
  private readonly url = environment.apiUrl;

  /** Crea un gateway dentro de la lane indicada. */
  crear(laneId: number, gateway: GatewayRequest): Observable<GatewayGuardado> {
    return this.http.post<GatewayGuardado>(`${this.url}/lanes/${laneId}/gateways`, gateway);
  }

  /** Modifica un gateway existente. */
  actualizar(id: number, gateway: GatewayRequest): Observable<GatewayGuardado> {
    return this.http.put<GatewayGuardado>(`${this.url}/gateways/${id}`, gateway);
  }

  /** Consulta qué pasaría si se elimina el gateway, sin borrarlo. */
  impacto(id: number): Observable<Impacto> {
    return this.http.get<Impacto>(`${this.url}/gateways/${id}/impacto`);
  }

  /** Elimina el gateway. */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/gateways/${id}`);
  }
}
