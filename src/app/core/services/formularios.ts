import { FormGroup } from '@angular/forms';

import { ProblemDetail } from '../../models/problem-detail.model';

/**
 * Lleva los errores de validación del backend (ProblemDetail.errors, 400) a los controles del
 * formulario, para mostrarlos debajo de cada campo como los de Angular. Devuelve true si
 * asignó al menos uno.
 */
export function aplicarErroresDelServidor(form: FormGroup, problema: ProblemDetail): boolean {
  // Cuenta cuántos errores lograron asignarse a un control
  let asignados = 0;
  // errors es un mapa campo -> mensaje; puede venir vacío
  for (const [campo, mensaje] of Object.entries(problema.errors ?? {})) {
    const control = form.get(campo);
    // Solo se asigna si el formulario tiene un control con ese nombre
    if (control) {
      // Se conserva lo que ya tuviera el control y se agrega el error "servidor" con el mensaje
      control.setErrors({ ...(control.errors ?? {}), servidor: mensaje });
      // Se marca como tocado para que la vista muestre el error de inmediato
      control.markAsTouched();
      asignados++;
    }
  }
  return asignados > 0;
}

/** Quita espacios al inicio y al final de cada texto del formulario. */
export function limpiarTextos<T extends object>(valores: T): T {
  // Copia para no modificar el objeto original
  const limpio = { ...valores } as Record<string, unknown>;
  for (const [clave, valor] of Object.entries(limpio)) {
    // Solo los strings se recortan; números, booleanos, etc. quedan igual
    if (typeof valor === 'string') {
      limpio[clave] = valor.trim();
    }
  }
  return limpio as T;
}
