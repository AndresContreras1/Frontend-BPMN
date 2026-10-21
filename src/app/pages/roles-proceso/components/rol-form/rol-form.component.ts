import { Component, input, OnChanges, output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CampoErrorComponent } from '../../../../components/campo-error/campo-error.component';
import { aplicarErroresDelServidor } from '../../../../core/services/formularios';
import { ProblemDetail } from '../../../../models/problem-detail.model';
import { RolProceso, RolProcesoRequest } from '../../../../models/rol-proceso.model';

/**
 * HU-17 y HU-18: crear o editar un rol de proceso en el mismo formulario. El padre decide qué hacer
 * con los datos (output guardar) y le devuelve el error de la API (input problema).
 */
@Component({
  selector: 'app-rol-form',
  imports: [ReactiveFormsModule, CampoErrorComponent],
  templateUrl: './rol-form.component.html',
})
export class RolFormComponent implements OnChanges {
  /** null: rol nuevo. */
  rol = input<RolProceso | null>(null);
  /** True mientras el padre esta guardando; deshabilita el boton y muestra el spinner. */
  guardando = input<boolean>(false);
  /** Error que devolvio la API; el formulario lo pinta en los campos que correspondan. */
  problema = input<ProblemDetail | null>(null);

  /** Emite los datos ya limpios cuando el formulario es valido; el padre hace la peticion. */
  guardar = output<RolProcesoRequest>();
  /** Avisa al padre que el usuario cancelo, para que cierre el formulario. */
  cancelar = output<void>();

  /** Formulario reactivo con sus validaciones (los maximos coinciden con los de la API). */
  rolForm = new FormGroup({
    nombre: new FormControl('', [Validators.required, Validators.maxLength(80)]),
    descripcion: new FormControl('', [Validators.maxLength(300)]),
  });

  /**
   * Se ejecuta cada vez que cambia un input. Como el formulario se reutiliza, aqui se
   * rellena con el rol a editar (o se limpia si es nuevo) y se aplican los errores del servidor.
   */
  ngOnChanges(cambios: SimpleChanges): void {
    // Solo si cambio el rol: reset deja el formulario limpio y con los valores del rol
    if (cambios['rol']) {
      const rol = this.rol();
      this.rolForm.reset({ nombre: rol?.nombre ?? '', descripcion: rol?.descripcion ?? '' });
    }
    const problema = this.problema();
    // Solo si cambio el problema y no es null: se marcan los errores en los campos
    if (cambios['problema'] && problema) {
      aplicarErroresDelServidor(this.rolForm, problema);
    }
  }

  /** Valida y, si todo esta bien, emite los datos al padre. */
  handleSubmit(): void {
    // Con campos invalidos se marcan como tocados para mostrar los errores y no se emite nada
    if (this.rolForm.invalid) {
      this.rolForm.markAllAsTouched();
      return;
    }
    const v = this.rolForm.value;
    // Se quitan espacios sobrantes; una descripcion vacia se envia como null
    this.guardar.emit({ nombre: (v.nombre ?? '').trim(), descripcion: (v.descripcion ?? '').trim() || null });
  }
}
