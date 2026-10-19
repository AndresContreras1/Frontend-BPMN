import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { GatewayGuardado, Impacto } from '../models/diagrama.model';
import { GatewayRequest } from '../models/nodo.model';

/** HU-14 a HU-16: gateways; al guardar la API devuelve las advertencias de sus ramas. */
@Injectable({ providedIn: 'root' })
export class GatewayService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;

  crear(laneId: number, gateway: GatewayRequest): Observable<GatewayGuardado> {
    return this.http.post<GatewayGuardado>(`${this.url}/lanes/${laneId}/gateways`, gateway);
  }

  actualizar(id: number, gateway: GatewayRequest): Observable<GatewayGuardado> {
    return this.http.put<GatewayGuardado>(`${this.url}/gateways/${id}`, gateway);
  }

  impacto(id: number): Observable<Impacto> {
    return this.http.get<Impacto>(`${this.url}/gateways/${id}/impacto`);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/gateways/${id}`);
  }
}
