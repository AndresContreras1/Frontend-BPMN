import { Component, input, OnChanges, output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CampoErrorComponent } from '../../../../components/campo-error/campo-error.component';
import { aplicarErroresDelServidor } from '../../../../core/services/formularios';
import { Arco } from '../../../../models/arco.model';
import { Nodo } from '../../../../models/nodo.model';
import { ProblemDetail } from '../../../../models/problem-detail.model';

export interface DatosArco {
  origenId: number;
  destinoId: number;
  etiqueta: string | null;
  condicion: string | null;
}

/** Nombre corto de un elemento para mostrarlo en listas. */
export function nombreDeNodo(nodo: Nodo): string {
  const tipo: Record<string, string> = {
    ACTIVIDAD: 'Actividad',
    GATEWAY: 'Gateway',
    EVENTO_INICIO: 'Inicio',
    EVENTO_FIN: 'Fin',
    MESSAGE_THROW: 'Envío de mensaje',
    MESSAGE_CATCH: 'Recepción de mensaje',
  };
  return nodo.nombre ? `${nodo.nombre} (${tipo[nodo.tipo]})` : `${tipo[nodo.tipo]} #${nodo.id}`;
}

/**
 * HU-11 (crear) y HU-12 (editar) un flujo de secuencia. Origen y destino deben estar en el mismo
 * pool; la condición solo va en las salidas de un gateway exclusivo o inclusivo.
 */
@Component({
  selector: 'app-arco-form',
  imports: [ReactiveFormsModule, CampoErrorComponent],
  templateUrl: './arco-form.component.html',
})
export class ArcoFormComponent implements OnChanges {
  arco = input<Arco | null>(null);
  origenId = input<number | null>(null);
  destinoId = input<number | null>(null);
  nodos = input<Nodo[]>([]);
  editable = input<boolean>(true);
  guardando = input<boolean>(false);
  problema = input<ProblemDetail | null>(null);

  guardar = output<DatosArco>();

  readonly nombreDeNodo = nombreDeNodo;

  arcoForm = new FormGroup({
    origenId: new FormControl<number | null>(null, Validators.required),
    destinoId: new FormControl<number | null>(null, Validators.required),
    etiqueta: new FormControl('', [Validators.maxLength(80)]),
    condicion: new FormControl('', [Validators.maxLength(200)]),
  });

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['arco'] || cambios['origenId'] || cambios['destinoId']) {
      const arco = this.arco();
      this.arcoForm.reset({
        origenId: arco?.origenId ?? this.origenId(),
        destinoId: arco?.destinoId ?? this.destinoId(),
        etiqueta: arco?.etiqueta ?? '',
        condicion: arco?.condicion ?? '',
      });
    }
    if (cambios['editable']) {
      if (this.editable()) {
        this.arcoForm.enable();
      } else {
        this.arcoForm.disable();
      }
    }
    const problema = this.problema();
    if (cambios['problema'] && problema) {
      aplicarErroresDelServidor(this.arcoForm, problema);
    }
  }

  origen(): Nodo | null {
    const id = this.arcoForm.controls.origenId.value;
    return this.nodos().find((n) => n.id === Number(id)) ?? null;
  }

  /** Destinos posibles: del mismo pool, distintos del origen y que no sean un inicio. */
  destinos(): Nodo[] {
    const origen = this.origen();
    return this.nodos().filter((n) => !origen || (n.poolId === origen.poolId && n.id !== origen.id && n.tipo !== 'EVENTO_INICIO'
      && !(n.tipo === 'MESSAGE_CATCH' && n.variante === 'INICIO')));
  }

  /** Orígenes posibles: todo menos los eventos de fin. */
  origenes(): Nodo[] {
    return this.nodos().filter((n) => n.tipo !== 'EVENTO_FIN' && !(n.tipo === 'MESSAGE_THROW' && n.variante === 'FIN'));
  }

  admiteCondicion(): boolean {
    const origen = this.origen();
    return origen?.tipo === 'GATEWAY' && origen.tipoGateway !== 'PARALELO';
  }

  handleSubmit(): void {
    if (this.arcoForm.invalid) {
      this.arcoForm.markAllAsTouched();
      return;
    }
    const v = this.arcoForm.getRawValue();
    this.guardar.emit({
      origenId: Number(v.origenId),
      destinoId: Number(v.destinoId),
      etiqueta: (v.etiqueta ?? '').trim() || null,
      condicion: this.admiteCondicion() ? (v.condicion ?? '').trim() || null : null,
    });
  }
}
