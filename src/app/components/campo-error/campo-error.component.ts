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
  /** Control del formulario reactivo al que pertenecen los mensajes. */
  control = input.required<AbstractControl | null>();
  /** Textos propios por validador, por ejemplo { pattern: 'El NIT ...' }. */
  mensajes = input<Record<string, string>>({});

  /** Lista de textos de error del control; vacía si no hay errores o el usuario aún no lo toca. */
  errores(): string[] {
    // Leemos el input una sola vez para no llamarlo varias veces
    const control = this.control();
    // Sin control, sin errores o sin haber tocado el campo: no mostramos nada
    if (!control || !control.errors || !control.touched) {
      return [];
    }
    // control.errors es un objeto { validador: datos }; cada clave se traduce a un texto
    return Object.entries(control.errors).map(([clave, valor]) => this.texto(clave, valor));
  }

  /** Devuelve el mensaje en español para un validador (clave) con los datos que dejó (valor). */
  private texto(clave: string, valor: unknown): string {
    // Si el padre mandó un texto propio para este validador, tiene prioridad
    const propio = this.mensajes()[clave];
    if (propio) {
      return propio;
    }
    // Datos extra que guardan algunos validadores (largo requerido, mínimo, máximo)
    const detalle = valor as { requiredLength?: number; min?: number; max?: number };
    // Mensajes por defecto según el validador que falló
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
      // Error devuelto por el backend: ya viene como texto
      case 'servidor':
        return String(valor);
      // Cualquier otro validador sin mensaje definido
      default:
        return 'El valor no es válido';
    }
  }
}
