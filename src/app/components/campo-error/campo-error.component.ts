import { Component, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';

/**
 * Mensajes de error de un campo del formulario: solo aparecen cuando el usuario ya lo tocó
 * (touched) y el valor no cumple (invalid). También muestra el error que devolvió el backend.
 */
@Component({
  selector: 'app-campo-error',
  templateUrl: './campo-error.component.html',
})
export class CampoErrorComponent {
  control = input.required<AbstractControl | null>();
  /** Textos propios por validador, por ejemplo { pattern: 'El NIT ...' }. */
  mensajes = input<Record<string, string>>({});

  errores(): string[] {
    const control = this.control();
    if (!control || !control.errors || !control.touched) {
      return [];
    }
    return Object.entries(control.errors).map(([clave, valor]) => this.texto(clave, valor));
  }

  private texto(clave: string, valor: unknown): string {
    const propio = this.mensajes()[clave];
    if (propio) {
      return propio;
    }
    const detalle = valor as { requiredLength?: number; min?: number; max?: number };
    switch (clave) {
      case 'required':
        return 'Este campo es obligatorio';
      case 'email':
        return 'El correo no tiene un formato válido';
      case 'minlength':
        return `Debe tener al menos ${detalle.requiredLength} caracteres`;
      case 'maxlength':
        return `Admite máximo ${detalle.requiredLength} caracteres`;
      case 'min':
        return `El valor mínimo es ${detalle.min}`;
      case 'max':
        return `El valor máximo es ${detalle.max}`;
      case 'servidor':
        return String(valor);
      default:
        return 'El valor no es válido';
    }
  }
}
