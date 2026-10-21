// OnChanges: Angular lo llama cuando cambia algún input(). SimpleChanges indica cuáles cambiaron.
import { Component, input, OnChanges, output, SimpleChanges } from '@angular/core';
// Formularios reactivos definidos en TypeScript.
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// Componente de mensajes de error por campo y utilidad que aplica los errores del servidor al formulario.
import { CampoErrorComponent } from '../../../../components/campo-error/campo-error.component';
import { aplicarErroresDelServidor } from '../../../../core/services/formularios';
// Modelos de datos: arco (flujo de secuencia), nodo y error de la API.
import { Arco } from '../../../../models/arco.model';
import { Nodo } from '../../../../models/nodo.model';
import { ProblemDetail } from '../../../../models/problem-detail.model';

/** Datos que el formulario entrega al padre al guardar un arco. */
export interface DatosArco {
  // Nodo de donde sale el flujo.
  origenId: number;
  // Nodo al que llega el flujo.
  destinoId: number;
  // Texto opcional que se dibuja sobre el arco (por ejemplo Sí o No).
  etiqueta: string | null;
  // Condición de la salida de un gateway (solo exclusivo o inclusivo).
  condicion: string | null;
}

/** Nombre corto de un elemento para mostrarlo en listas. */
// Se exporta para usarla también desde otros archivos y desde la plantilla.
export function nombreDeNodo(nodo: Nodo): string {
  // Texto legible por cada tipo de nodo.
  const tipo: Record<string, string> = {
    ACTIVIDAD: 'Actividad',
    GATEWAY: 'Gateway',
    EVENTO_INICIO: 'Inicio',
    EVENTO_FIN: 'Fin',
    MESSAGE_THROW: 'Envío de mensaje',
    MESSAGE_CATCH: 'Recepción de mensaje',
  };
  // Con nombre: 'Nombre (Tipo)'. Sin nombre: 'Tipo #id' para poder distinguirlo.
  return nodo.nombre ? `${nodo.nombre} (${tipo[nodo.tipo]})` : `${tipo[nodo.tipo]} #${nodo.id}`;
}

/**
 * HU-11 (crear) y HU-12 (editar) un flujo de secuencia. Origen y destino deben estar en el mismo
 * pool; la condición solo va en las salidas de un gateway exclusivo o inclusivo.
 */
@Component({
  // Etiqueta del componente.
  selector: 'app-arco-form',
  // ReactiveFormsModule habilita formGroup/formControlName en la plantilla.
  imports: [ReactiveFormsModule, CampoErrorComponent],
  // Plantilla HTML.
  templateUrl: './arco-form.component.html',
})
export class ArcoFormComponent implements OnChanges {
  /** Arco que se edita (null si se está creando uno nuevo). */
  arco = input<Arco | null>(null);
  /** Origen sugerido al crear (el primer nodo elegido con la herramienta conectar). */
  origenId = input<number | null>(null);
  /** Destino sugerido al crear (el segundo nodo elegido). */
  destinoId = input<number | null>(null);
  /** Todos los nodos del diagrama: de aquí salen las opciones de origen y destino. */
  nodos = input<Nodo[]>([]);
  /** Si es false el formulario queda deshabilitado. */
  editable = input<boolean>(true);
  /** true mientras el padre guarda (deshabilita el botón). */
  guardando = input<boolean>(false);
  /** Error de la API; sus errores por campo se pintan en el formulario. */
  problema = input<ProblemDetail | null>(null);

  /** Entrega los datos del arco al padre, que es quien llama a la API. */
  guardar = output<DatosArco>();

  /** Expone la función a la plantilla (la plantilla solo ve las propiedades de la clase). */
  readonly nombreDeNodo = nombreDeNodo;

  /** Formulario del arco con sus validadores. */
  arcoForm = new FormGroup({
    // Origen y destino obligatorios.
    origenId: new FormControl<number | null>(null, Validators.required),
    destinoId: new FormControl<number | null>(null, Validators.required),
    // Etiqueta: máximo 80 caracteres.
    etiqueta: new FormControl('', [Validators.maxLength(80)]),
    // Condición: máximo 200 caracteres.
    condicion: new FormControl('', [Validators.maxLength(200)]),
  });

  /** Reacciona a los cambios de los inputs: rellena el formulario, lo habilita o deshabilita y muestra errores del servidor. */
  ngOnChanges(cambios: SimpleChanges): void {
    // Cambió el arco o los extremos sugeridos: se rellena el formulario (con el arco existente o con los nodos elegidos en el lienzo).
    if (cambios['arco'] || cambios['origenId'] || cambios['destinoId']) {
      const arco = this.arco();
      this.arcoForm.reset({
        origenId: arco?.origenId ?? this.origenId(),
        destinoId: arco?.destinoId ?? this.destinoId(),
        etiqueta: arco?.etiqueta ?? '',
        condicion: arco?.condicion ?? '',
      });
    }
    // Sin permiso de edición se deshabilitan los campos.
    if (cambios['editable']) {
      if (this.editable()) {
        this.arcoForm.enable();
      } else {
        this.arcoForm.disable();
      }
    }
    // Si la API rechazó el guardado, se copian sus errores a los campos.
    const problema = this.problema();
    if (cambios['problema'] && problema) {
      aplicarErroresDelServidor(this.arcoForm, problema);
    }
  }

  /** Nodo que está elegido como origen en el formulario (null si no hay). */
  origen(): Nodo | null {
    const id = this.arcoForm.controls.origenId.value;
    // Number(id) porque el valor del select puede llegar como texto.
    return this.nodos().find((n) => n.id === Number(id)) ?? null;
  }

  /** Destinos posibles: del mismo pool, distintos del origen y que no sean un inicio. */
  destinos(): Nodo[] {
    // Regla BPMN: el flujo no cruza pools, no vuelve al mismo nodo y no entra a un inicio (ni a una recepción de inicio).
    const origen = this.origen();
    return this.nodos().filter((n) => !origen || (n.poolId === origen.poolId && n.id !== origen.id && n.tipo !== 'EVENTO_INICIO'
      && !(n.tipo === 'MESSAGE_CATCH' && n.variante === 'INICIO')));
  }

  /** Orígenes posibles: todo menos los eventos de fin. */
  origenes(): Nodo[] {
    return this.nodos().filter((n) => n.tipo !== 'EVENTO_FIN' && !(n.tipo === 'MESSAGE_THROW' && n.variante === 'FIN'));
  }

  /** Solo las salidas de un gateway exclusivo o inclusivo llevan condición; el paralelo sigue todos los caminos. */
  admiteCondicion(): boolean {
    const origen = this.origen();
    return origen?.tipo === 'GATEWAY' && origen.tipoGateway !== 'PARALELO';
  }

  /** Al enviar: si hay errores los muestra; si no, emite los datos limpios al padre. */
  handleSubmit(): void {
    if (this.arcoForm.invalid) {
      // markAllAsTouched hace visibles los errores de todos los campos.
      this.arcoForm.markAllAsTouched();
      return;
    }
    // getRawValue incluye también campos deshabilitados.
    const v = this.arcoForm.getRawValue();
    this.guardar.emit({
      origenId: Number(v.origenId),
      destinoId: Number(v.destinoId),
      // trim quita espacios; si queda vacío se envía null (`|| null`). La condición solo se envía si el origen la admite.
      etiqueta: (v.etiqueta ?? '').trim() || null,
      condicion: this.admiteCondicion() ? (v.condicion ?? '').trim() || null : null,
    });
  }
}
