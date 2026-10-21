import { HttpErrorResponse } from '@angular/common/http';

import { ProblemDetail } from '../../models/problem-detail.model';

/** Convierte cualquier error HTTP en un ProblemDetail que la vista puede mostrar sin detalles técnicos. */
export function problemaDe(error: unknown): ProblemDetail {
  if (error instanceof HttpErrorResponse) {
    // Estado 0: la petición ni llegó al servidor (sin red o servidor caído)
    if (error.status === 0) {
      return { title: 'Sin conexión', status: 0, detail: 'No hay conexión con el servidor. Intente de nuevo.' };
    }
    // Si el backend respondió con un ProblemDetail (tiene title), se usa tal cual y se asegura el status
    const cuerpo = error.error as Partial<ProblemDetail> | null;
    if (cuerpo && typeof cuerpo === 'object' && cuerpo.title) {
      return { ...cuerpo, status: error.status } as ProblemDetail;
    }
    // Errores 5xx sin cuerpo útil: mensaje genérico para no mostrar detalles internos
    if (error.status >= 500) {
      return { title: 'Error del servidor', status: error.status, detail: 'Ocurrió un error inesperado. Intente más tarde.' };
    }
    // Cualquier otro error HTTP
    return { title: 'Error', status: error.status, detail: 'No se pudo completar la operación.' };
  }
  // No era un error HTTP (fallo de programación u otro): mensaje genérico con status -1
  return { title: 'Error', status: -1, detail: 'Ocurrió un error inesperado.' };
}
