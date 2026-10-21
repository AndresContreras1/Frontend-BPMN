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
  guardando = input<boolean>(false);
  problema = input<ProblemDetail | null>(null);

  guardar = output<RolProcesoRequest>();
  cancelar = output<void>();

  rolForm = new FormGroup({
    nombre: new FormControl('', [Validators.required, Validators.maxLength(80)]),
    descripcion: new FormControl('', [Validators.maxLength(300)]),
  });

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['rol']) {
      const rol = this.rol();
      this.rolForm.reset({ nombre: rol?.nombre ?? '', descripcion: rol?.descripcion ?? '' });
    }
    const problema = this.problema();
    if (cambios['problema'] && problema) {
      aplicarErroresDelServidor(this.rolForm, problema);
    }
  }

  handleSubmit(): void {
    if (this.rolForm.invalid) {
      this.rolForm.markAllAsTouched();
      return;
    }
    const v = this.rolForm.value;
    this.guardar.emit({ nombre: (v.nombre ?? '').trim(), descripcion: (v.descripcion ?? '').trim() || null });
  }
}
