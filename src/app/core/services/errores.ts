import { HttpErrorResponse } from '@angular/common/http';

import { ProblemDetail } from '../../models/problem-detail.model';

/** Convierte cualquier error HTTP en un ProblemDetail que la vista puede mostrar sin detalles técnicos. */
export function problemaDe(error: unknown): ProblemDetail {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return { title: 'Sin conexión', status: 0, detail: 'No hay conexión con el servidor. Intente de nuevo.' };
    }
    const cuerpo = error.error as Partial<ProblemDetail> | null;
    if (cuerpo && typeof cuerpo === 'object' && cuerpo.title) {
      return { ...cuerpo, status: error.status } as ProblemDetail;
    }
    if (error.status >= 500) {
      return { title: 'Error del servidor', status: error.status, detail: 'Ocurrió un error inesperado. Intente más tarde.' };
    }
    return { title: 'Error', status: error.status, detail: 'No se pudo completar la operación.' };
  }
  return { title: 'Error', status: -1, detail: 'Ocurrió un error inesperado.' };
}
