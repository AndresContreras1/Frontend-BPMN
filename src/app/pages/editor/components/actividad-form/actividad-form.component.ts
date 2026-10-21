import { Component, input, OnChanges, output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CampoErrorComponent } from '../../../../components/campo-error/campo-error.component';
import { aplicarErroresDelServidor } from '../../../../core/services/formularios';
import { Lane } from '../../../../models/lane.model';
import { ActividadRequest, Nodo, TipoActividad } from '../../../../models/nodo.model';
import { ProblemDetail } from '../../../../models/problem-detail.model';
import { Ubicacion } from '../../editor.store';

export const TIPOS_ACTIVIDAD: { valor: TipoActividad; texto: string }[] = [
  { valor: 'TAREA', texto: 'Tarea' },
  { valor: 'USUARIO', texto: 'De usuario' },
  { valor: 'MANUAL', texto: 'Manual' },
  { valor: 'SERVICIO', texto: 'De servicio' },
  { valor: 'ENVIO', texto: 'De envío' },
  { valor: 'RECEPCION', texto: 'De recepción' },
];

/**
 * HU-08 (crear) y HU-09 (editar) una actividad. La lane es obligatoria: define el rol responsable.
 * Cambiar la lane cambia el responsable y conserva los arcos (solo dentro del mismo pool).
 */
@Component({
  selector: 'app-actividad-form',
  imports: [ReactiveFormsModule, CampoErrorComponent],
  templateUrl: './actividad-form.component.html',
})
export class ActividadFormComponent implements OnChanges {
  nodo = input<Nodo | null>(null);
  ubicacion = input<Ubicacion | null>(null);
  lanes = input<Lane[]>([]);
  editable = input<boolean>(true);
  guardando = input<boolean>(false);
  problema = input<ProblemDetail | null>(null);

  guardar = output<ActividadRequest>();

  readonly tipos = TIPOS_ACTIVIDAD;

  actividadForm = new FormGroup({
    nombre: new FormControl('', [Validators.required, Validators.maxLength(120)]),
    tipoActividad: new FormControl<TipoActividad>('USUARIO', { nonNullable: true }),
    laneId: new FormControl<number | null>(null, Validators.required),
    posX: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(10000)] }),
    posY: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(10000)] }),
  });

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['nodo'] || cambios['ubicacion']) {
      const nodo = this.nodo();
      const ubicacion = this.ubicacion();
      this.actividadForm.reset({
        nombre: nodo?.nombre ?? '',
        tipoActividad: nodo?.tipoActividad ?? 'USUARIO',
        laneId: nodo ? nodo.laneId : (ubicacion?.laneId ?? null),
        posX: nodo?.posX ?? ubicacion?.posX ?? 0,
        posY: nodo?.posY ?? ubicacion?.posY ?? 0,
      });
    }
    if (cambios['editable']) {
      if (this.editable()) {
        this.actividadForm.enable();
      } else {
        this.actividadForm.disable();
      }
    }
    const problema = this.problema();
    if (cambios['problema'] && problema) {
      aplicarErroresDelServidor(this.actividadForm, problema);
    }
  }

  handleSubmit(): void {
    if (this.actividadForm.invalid) {
      this.actividadForm.markAllAsTouched();
      return;
    }
    const v = this.actividadForm.getRawValue();
    this.guardar.emit({
      nombre: (v.nombre ?? '').trim(),
      tipoActividad: v.tipoActividad,
      laneId: Number(v.laneId),
      posX: Number(v.posX),
      posY: Number(v.posY),
    });
  }
}
