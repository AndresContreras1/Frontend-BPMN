import { Component, input, OnChanges, output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CampoErrorComponent } from '../../../../components/campo-error/campo-error.component';
import { aplicarErroresDelServidor } from '../../../../core/services/formularios';
import { Lane } from '../../../../models/lane.model';
import { EventoRequest, Nodo } from '../../../../models/nodo.model';
import { ProblemDetail } from '../../../../models/problem-detail.model';
import { Ubicacion } from '../../editor.store';

/** Evento de inicio o de fin: nombre opcional, lane opcional y posición. */
@Component({
  selector: 'app-evento-form',
  imports: [ReactiveFormsModule, CampoErrorComponent],
  templateUrl: './evento-form.component.html',
})
export class EventoFormComponent implements OnChanges {
  /** null: evento nuevo en la ubicación indicada. */
  nodo = input<Nodo | null>(null);
  ubicacion = input<Ubicacion | null>(null);
  tipoInicial = input<'INICIO' | 'FIN'>('INICIO');
  lanes = input<Lane[]>([]);
  editable = input<boolean>(true);
  guardando = input<boolean>(false);
  problema = input<ProblemDetail | null>(null);

  guardar = output<EventoRequest>();

  eventoForm = new FormGroup({
    tipo: new FormControl<'INICIO' | 'FIN'>('INICIO', { nonNullable: true }),
    nombre: new FormControl('', [Validators.maxLength(120)]),
    laneId: new FormControl<number | null>(null),
    posX: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(10000)] }),
    posY: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(10000)] }),
  });

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['nodo'] || cambios['ubicacion'] || cambios['tipoInicial']) {
      const nodo = this.nodo();
      const ubicacion = this.ubicacion();
      this.eventoForm.reset({
        tipo: nodo ? (nodo.tipo === 'EVENTO_FIN' ? 'FIN' : 'INICIO') : this.tipoInicial(),
        nombre: nodo?.nombre ?? '',
        laneId: nodo ? nodo.laneId : (ubicacion?.laneId ?? null),
        posX: nodo?.posX ?? ubicacion?.posX ?? 0,
        posY: nodo?.posY ?? ubicacion?.posY ?? 0,
      });
    }
    if (cambios['editable']) {
      if (this.editable()) {
        this.eventoForm.enable();
      } else {
        this.eventoForm.disable();
      }
    }
    const problema = this.problema();
    if (cambios['problema'] && problema) {
      aplicarErroresDelServidor(this.eventoForm, problema);
    }
  }

  handleSubmit(): void {
    if (this.eventoForm.invalid) {
      this.eventoForm.markAllAsTouched();
      return;
    }
    const v = this.eventoForm.getRawValue();
    this.guardar.emit({
      tipo: v.tipo,
      nombre: (v.nombre ?? '').trim() || null,
      laneId: v.laneId === null ? null : Number(v.laneId),
      posX: Number(v.posX),
      posY: Number(v.posY),
    });
  }
}
