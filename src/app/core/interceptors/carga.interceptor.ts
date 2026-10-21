import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';

import { CargaService } from '../services/carga.service';

/** Indicador de carga global: cuenta cada petición y la descuenta al terminar, con éxito o con error. */
export const cargaInterceptor: HttpInterceptorFn = (req, next) => {
  const carga = inject(CargaService);
  carga.iniciar();
  return next(req).pipe(finalize(() => carga.terminar()));
};
