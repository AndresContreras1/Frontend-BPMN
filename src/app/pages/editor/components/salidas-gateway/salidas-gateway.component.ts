import { Component, input, OnChanges, output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CampoErrorComponent } from '../../../../components/campo-error/campo-error.component';
import { Arco } from '../../../../models/arco.model';
import { Nodo, TipoGateway } from '../../../../models/nodo.model';

/** Nueva condición de un arco que sale del gateway (null la quita). */
export interface CondicionArco {
  arco: Arco;
  condicion: string | null;
}

/**
 * HU-15: desde el gateway se actualizan las condiciones de cada arco saliente. En un paralelo no hay
 * condiciones (se siguen todos los caminos); en exclusivo e inclusivo cada salida debe tener la suya.
 */
@Component({
  selector: 'app-salidas-gateway',
  imports: [ReactiveFormsModule, CampoErrorComponent],
  templateUrl: './salidas-gateway.component.html',
})
export class SalidasGatewayComponent implements OnChanges {
  salidas = input<Arco[]>([]);
  nodos = input<Nodo[]>([]);
  tipoGateway = input<TipoGateway | null>(null);
  editable = input<boolean>(true);
  guardando = input<boolean>(false);

  guardar = output<CondicionArco[]>();

  /** Un control por arco saliente, con la clave "arco<id>". */
  salidasForm = new FormGroup<Record<string, FormControl<string>>>({});

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['salidas']) {
      const controles: Record<string, FormControl<string>> = {};
      for (const arco of this.salidas()) {
        controles[this.clave(arco)] = new FormControl(arco.condicion ?? '', {
          nonNullable: true,
          validators: [Validators.maxLength(200)],
        });
      }
      this.salidasForm = new FormGroup(controles);
    }
    if (cambios['salidas'] || cambios['editable']) {
      if (this.editable()) {
        this.salidasForm.enable();
      } else {
        this.salidasForm.disable();
      }
    }
  }

  clave(arco: Arco): string {
    return `arco${arco.id}`;
  }

  esParalelo(): boolean {
    return this.tipoGateway() === 'PARALELO';
  }

  destino(arco: Arco): string {
    const nodo = this.nodos().find((n) => n.id === arco.destinoId);
    return nodo?.nombre || (nodo ? 'elemento sin nombre' : 'elemento eliminado');
  }

  handleSubmit(): void {
    if (this.salidasForm.invalid) {
      this.salidasForm.markAllAsTouched();
      return;
    }
    const valores = this.salidasForm.getRawValue();
    const cambios: CondicionArco[] = [];
    for (const arco of this.salidas()) {
      const condicion = (valores[this.clave(arco)] ?? '').trim() || null;
      if (condicion !== (arco.condicion ?? null)) {
        cambios.push({ arco, condicion });
      }
    }
    if (cambios.length) {
      this.guardar.emit(cambios);
    }
  }
}
