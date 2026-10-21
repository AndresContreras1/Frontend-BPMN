import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { parametros } from '../core/services/parametros';
import { HistorialCambio } from '../models/historial.model';
import { PageResponse, Paginacion } from '../models/page-response.model';
import { ProcesoResumen } from '../models/proceso.model';
import { RolProceso, RolProcesoRequest } from '../models/rol-proceso.model';

/** HU-17 a HU-20: catálogo de roles de proceso de la empresa (cada lane usa uno). */
@Injectable({ providedIn: 'root' })
export class RolProcesoService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/roles-proceso`;

  listar(nombre: string, paginacion: Paginacion): Observable<PageResponse<RolProceso>> {
    return this.http.get<PageResponse<RolProceso>>(this.url, { params: parametros(paginacion, { nombre }) });
  }

  obtener(id: number): Observable<RolProceso> {
    return this.http.get<RolProceso>(`${this.url}/${id}`);
  }

  crear(rol: RolProcesoRequest): Observable<RolProceso> {
    return this.http.post<RolProceso>(this.url, rol);
  }

  actualizar(id: number, rol: RolProcesoRequest): Observable<RolProceso> {
    return this.http.put<RolProceso>(`${this.url}/${id}`, rol);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  /** HU-20: procesos cuyas lanes usan el rol. */
  procesos(id: number): Observable<ProcesoResumen[]> {
    return this.http.get<ProcesoResumen[]>(`${this.url}/${id}/procesos`);
  }

  historial(id: number): Observable<HistorialCambio[]> {
    return this.http.get<HistorialCambio[]>(`${this.url}/${id}/historial`);
  }
}
