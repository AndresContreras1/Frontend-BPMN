import { Component, input, OnChanges, output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CampoErrorComponent } from '../../../../components/campo-error/campo-error.component';
import { aplicarErroresDelServidor } from '../../../../core/services/formularios';
import { Lane } from '../../../../models/lane.model';
import { GatewayRequest, Nodo, TipoGateway } from '../../../../models/nodo.model';
import { ProblemDetail } from '../../../../models/problem-detail.model';
import { Ubicacion } from '../../editor.store';

export const TIPOS_GATEWAY: { valor: TipoGateway; texto: string; ayuda: string }[] = [
  { valor: 'EXCLUSIVO', texto: 'Exclusivo (X)', ayuda: 'Sigue un solo camino: cada salida lleva una condición distinta.' },
  { valor: 'PARALELO', texto: 'Paralelo (+)', ayuda: 'Sigue todos los caminos a la vez: las salidas no llevan condición.' },
  { valor: 'INCLUSIVO', texto: 'Inclusivo (O)', ayuda: 'Sigue uno o varios caminos según sus condiciones.' },
];

/** HU-14 (crear) y HU-15 (editar) un gateway en una lane. */
@Component({
  selector: 'app-gateway-form',
  imports: [ReactiveFormsModule, CampoErrorComponent],
  templateUrl: './gateway-form.component.html',
})
export class GatewayFormComponent implements OnChanges {
  nodo = input<Nodo | null>(null);
  ubicacion = input<Ubicacion | null>(null);
  lanes = input<Lane[]>([]);
  editable = input<boolean>(true);
  guardando = input<boolean>(false);
  problema = input<ProblemDetail | null>(null);

  guardar = output<GatewayRequest>();

  readonly tipos = TIPOS_GATEWAY;

  gatewayForm = new FormGroup({
    nombre: new FormControl('', [Validators.maxLength(120)]),
    tipoGateway: new FormControl<TipoGateway>('EXCLUSIVO', { nonNullable: true }),
    laneId: new FormControl<number | null>(null, Validators.required),
    posX: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(10000)] }),
    posY: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(10000)] }),
  });

  ayudaTipo(): string {
    return this.tipos.find((t) => t.valor === this.gatewayForm.controls.tipoGateway.value)?.ayuda ?? '';
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['nodo'] || cambios['ubicacion']) {
      const nodo = this.nodo();
      const ubicacion = this.ubicacion();
      this.gatewayForm.reset({
        nombre: nodo?.nombre ?? '',
        tipoGateway: nodo?.tipoGateway ?? 'EXCLUSIVO',
        laneId: nodo ? nodo.laneId : (ubicacion?.laneId ?? null),
        posX: nodo?.posX ?? ubicacion?.posX ?? 0,
        posY: nodo?.posY ?? ubicacion?.posY ?? 0,
      });
    }
    if (cambios['editable']) {
      if (this.editable()) {
        this.gatewayForm.enable();
      } else {
        this.gatewayForm.disable();
      }
    }
    const problema = this.problema();
    if (cambios['problema'] && problema) {
      aplicarErroresDelServidor(this.gatewayForm, problema);
    }
  }

  handleSubmit(): void {
    if (this.gatewayForm.invalid) {
      this.gatewayForm.markAllAsTouched();
      return;
    }
    const v = this.gatewayForm.getRawValue();
    this.guardar.emit({
      nombre: (v.nombre ?? '').trim() || null,
      tipoGateway: v.tipoGateway,
      laneId: Number(v.laneId),
      posX: Number(v.posX),
      posY: Number(v.posY),
    });
  }
}
