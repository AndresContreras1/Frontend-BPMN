import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Empresa, RegistroEmpresaRequest, RegistroEmpresaResponse } from '../models/empresa.model';

/** HU-01: registro de la empresa y consulta de la empresa del usuario. */
@Injectable({ providedIn: 'root' })
export class EmpresaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/empresas`;

  registrar(datos: RegistroEmpresaRequest): Observable<RegistroEmpresaResponse> {
    return this.http.post<RegistroEmpresaResponse>(this.url, datos);
  }

  actual(): Observable<Empresa> {
    return this.http.get<Empresa>(`${this.url}/actual`);
  }
}
