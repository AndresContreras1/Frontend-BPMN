import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Empresa, RegistroEmpresaRequest, RegistroEmpresaResponse } from '../models/empresa.model';

/** HU-01: registro de la empresa y consulta de la empresa del usuario. */
@Injectable({ providedIn: 'root' })
export class EmpresaService {
  /** Cliente HTTP de Angular para hacer las peticiones a la API. */
  private readonly http = inject(HttpClient);
  /** URL base de los endpoints de empresas. */
  private readonly url = `${environment.apiUrl}/empresas`;

  /** Registra una empresa nueva junto con su administrador. */
  registrar(datos: RegistroEmpresaRequest): Observable<RegistroEmpresaResponse> {
    return this.http.post<RegistroEmpresaResponse>(this.url, datos);
  }

  /** Devuelve la empresa del usuario que tiene la sesión iniciada. */
  actual(): Observable<Empresa> {
    return this.http.get<Empresa>(`${this.url}/actual`);
  }
}
