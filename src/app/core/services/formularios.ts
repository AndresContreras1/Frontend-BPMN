import { FormGroup } from '@angular/forms';

import { ProblemDetail } from '../../models/problem-detail.model';

/**
 * Lleva los errores de validación del backend (ProblemDetail.errors, 400) a los controles del
 * formulario, para mostrarlos debajo de cada campo como los de Angular. Devuelve true si
 * asignó al menos uno.
 */
export function aplicarErroresDelServidor(form: FormGroup, problema: ProblemDetail): boolean {
  let asignados = 0;
  for (const [campo, mensaje] of Object.entries(problema.errors ?? {})) {
    const control = form.get(campo);
    if (control) {
      control.setErrors({ ...(control.errors ?? {}), servidor: mensaje });
      control.markAsTouched();
      asignados++;
    }
  }
  return asignados > 0;
}

/** Quita espacios al inicio y al final de cada texto del formulario. */
export function limpiarTextos<T extends object>(valores: T): T {
  const limpio = { ...valores } as Record<string, unknown>;
  for (const [clave, valor] of Object.entries(limpio)) {
    if (typeof valor === 'string') {
      limpio[clave] = valor.trim();
    }
  }
  return limpio as T;
}
