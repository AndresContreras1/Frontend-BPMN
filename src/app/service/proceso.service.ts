import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { parametros } from '../core/services/parametros';
import { HistorialCambio } from '../models/historial.model';
import { PageResponse, Paginacion } from '../models/page-response.model';
import {
  Comparticion, FiltroProceso, Proceso, ProcesoActualizacionRequest, ProcesoCompartido, ProcesoRequest, ResumenProcesos,
} from '../models/proceso.model';

/** HU-04 a HU-07 y HU-23: procesos de la empresa, su historial y la compartición con otras empresas. */
@Injectable({ providedIn: 'root' })
export class ProcesoService {
  /** Cliente HTTP de Angular para hacer las peticiones a la API. */
  private readonly http = inject(HttpClient);
  /** URL base de los endpoints de procesos. */
  private readonly url = `${environment.apiUrl}/procesos`;

  /** Lista los procesos con filtros y paginación; parametros() arma los query params. */
  listar(filtro: FiltroProceso, paginacion: Paginacion): Observable<PageResponse<Proceso>> {
    return this.http.get<PageResponse<Proceso>>(this.url, {
      params: parametros(paginacion, {
        nombre: filtro.nombre,
        estado: filtro.estado,
        categoria: filtro.categoria,
        activo: filtro.activo,
      }),
    });
  }

  /** Indicadores del inicio: activos por estado, eliminados y compartidos conmigo. */
  resumen(): Observable<ResumenProcesos> {
    return this.http.get<ResumenProcesos>(`${this.url}/resumen`);
  }

  /** Lista las categorías que ya existen, para sugerirlas en los formularios. */
  categorias(): Observable<string[]> {
    return this.http.get<string[]>(`${this.url}/categorias`);
  }

  /** Trae un proceso por su id. */
  obtener(id: number): Observable<Proceso> {
    return this.http.get<Proceso>(`${this.url}/${id}`);
  }

  /** Crea un proceso nuevo (nace en borrador). */
  crear(proceso: ProcesoRequest): Observable<Proceso> {
    return this.http.post<Proceso>(this.url, proceso);
  }

  /** Modifica un proceso existente. */
  actualizar(id: number, proceso: ProcesoActualizacionRequest): Observable<Proceso> {
    return this.http.put<Proceso>(`${this.url}/${id}`, proceso);
  }

  /** Elimina el proceso. */
  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  /** Sin sort: la API ordena por fecha e id descendentes (lo más reciente primero). */
  historial(id: number, page: number, size = 10): Observable<PageResponse<HistorialCambio>> {
    return this.http.get<PageResponse<HistorialCambio>>(`${this.url}/${id}/historial`, { params: { page, size } });
  }

  /** Consulta con qué empresas está compartido el proceso. */
  comparticion(id: number): Observable<Comparticion> {
    return this.http.get<Comparticion>(`${this.url}/${id}/comparticion`);
  }

  /** Activa o desactiva la compartición y define las empresas (por NIT) que lo pueden ver. */
  compartir(id: number, compartido: boolean, nitsEmpresas: string[]): Observable<Comparticion> {
    return this.http.put<Comparticion>(`${this.url}/${id}/comparticion`, { compartido, nitsEmpresas });
  }

  /** Lista, paginados, los procesos que otras empresas compartieron con la mía. */
  compartidosConmigo(paginacion: Paginacion): Observable<PageResponse<ProcesoCompartido>> {
    return this.http.get<PageResponse<ProcesoCompartido>>(`${this.url}/compartidos`, { params: parametros(paginacion) });
  }
}
