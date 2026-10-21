// OnChanges: Angular lo llama cuando cambia algún input().
import { Component, input, OnChanges, output, SimpleChanges } from '@angular/core';
// Formularios reactivos.
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// Componente de errores por campo y utilidad que aplica errores del servidor al formulario.
import { CampoErrorComponent } from '../../../../components/campo-error/campo-error.component';
import { aplicarErroresDelServidor } from '../../../../core/services/formularios';
// Modelos de datos y ubicación del lienzo.
import { Lane } from '../../../../models/lane.model';
import { GatewayRequest, Nodo, TipoGateway } from '../../../../models/nodo.model';
import { ProblemDetail } from '../../../../models/problem-detail.model';
import { Ubicacion } from '../../editor.store';

/** Tipos de gateway BPMN: valor para la API, texto del selector y ayuda que explica cómo se comporta. */
export const TIPOS_GATEWAY: { valor: TipoGateway; texto: string; ayuda: string }[] = [
  { valor: 'EXCLUSIVO', texto: 'Exclusivo (X)', ayuda: 'Sigue un solo camino: cada salida lleva una condición distinta.' },
  { valor: 'PARALELO', texto: 'Paralelo (+)', ayuda: 'Sigue todos los caminos a la vez: las salidas no llevan condición.' },
  { valor: 'INCLUSIVO', texto: 'Inclusivo (O)', ayuda: 'Sigue uno o varios caminos según sus condiciones.' },
];

/** HU-14 (crear) y HU-15 (editar) un gateway en una lane. */
@Component({
  // Etiqueta del componente.
  selector: 'app-gateway-form',
  // Módulo de formularios reactivos y componente de errores.
  imports: [ReactiveFormsModule, CampoErrorComponent],
  // Plantilla HTML.
  templateUrl: './gateway-form.component.html',
})
export class GatewayFormComponent implements OnChanges {
  /** Gateway que se edita (null si se está creando uno nuevo). */
  nodo = input<Nodo | null>(null);
  /** Lugar del lienzo donde se hizo clic (pool, lane y posición). */
  ubicacion = input<Ubicacion | null>(null);
  /** Lanes del pool para elegir donde va el gateway. */
  lanes = input<Lane[]>([]);
  /** Si es false el formulario queda deshabilitado. */
  editable = input<boolean>(true);
  /** true mientras el padre guarda. */
  guardando = input<boolean>(false);
  /** Error de la API; sus errores por campo se pintan en el formulario. */
  problema = input<ProblemDetail | null>(null);

  /** Entrega los datos del gateway al padre, que llama a la API. */
  guardar = output<GatewayRequest>();

  /** Lista de tipos para el selector. */
  readonly tipos = TIPOS_GATEWAY;

  /** Formulario del gateway con sus validadores. */
  gatewayForm = new FormGroup({
    // Nombre (pregunta) opcional, máximo 120 caracteres.
    nombre: new FormControl('', [Validators.maxLength(120)]),
    // Por defecto exclusivo; nonNullable evita que quede en null.
    tipoGateway: new FormControl<TipoGateway>('EXCLUSIVO', { nonNullable: true }),
    // La lane es obligatoria: los gateways van dentro de una lane.
    laneId: new FormControl<number | null>(null, Validators.required),
    // Posición en el lienzo, entre 0 y 10000.
    posX: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(10000)] }),
    posY: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(10000)] }),
  });

  /** Texto de ayuda del tipo de gateway elegido ('' si no se encuentra). */
  ayudaTipo(): string {
    return this.tipos.find((t) => t.valor === this.gatewayForm.controls.tipoGateway.value)?.ayuda ?? '';
  }

  /** Reacciona a los cambios de los inputs: rellena el formulario, lo habilita o deshabilita y muestra errores del servidor. */
  ngOnChanges(cambios: SimpleChanges): void {
    // Cambió el gateway abierto o el lugar del clic: se rellena el formulario.
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
    // Sin permiso de edición se deshabilitan los campos.
    if (cambios['editable']) {
      if (this.editable()) {
        this.gatewayForm.enable();
      } else {
        this.gatewayForm.disable();
      }
    }
    // Si la API rechazó el guardado, se copian sus errores a los campos.
    const problema = this.problema();
    if (cambios['problema'] && problema) {
      aplicarErroresDelServidor(this.gatewayForm, problema);
    }
  }

  /** Al enviar: valida y, si todo está bien, emite los datos al padre. */
  handleSubmit(): void {
    if (this.gatewayForm.invalid) {
      // Hace visibles los errores de todos los campos.
      this.gatewayForm.markAllAsTouched();
      return;
    }
    const v = this.gatewayForm.getRawValue();
    this.guardar.emit({
      // Nombre vacío se envía como null; los números del input se convierten con Number.
      nombre: (v.nombre ?? '').trim() || null,
      tipoGateway: v.tipoGateway,
      laneId: Number(v.laneId),
      posX: Number(v.posX),
      posY: Number(v.posY),
    });
  }
}
