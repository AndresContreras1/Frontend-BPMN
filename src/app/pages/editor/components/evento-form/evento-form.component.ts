// OnChanges: Angular lo llama cuando cambia algún input().
import { Component, input, OnChanges, output, SimpleChanges } from '@angular/core';
// Formularios reactivos.
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// Componente de errores por campo y utilidad que aplica errores del servidor al formulario.
import { CampoErrorComponent } from '../../../../components/campo-error/campo-error.component';
import { aplicarErroresDelServidor } from '../../../../core/services/formularios';
// Modelos de datos y ubicación del lienzo.
import { Lane } from '../../../../models/lane.model';
import { EventoRequest, Nodo } from '../../../../models/nodo.model';
import { ProblemDetail } from '../../../../models/problem-detail.model';
import { Ubicacion } from '../../editor.store';

/** Evento de inicio o de fin: nombre opcional, lane opcional y posición. */
@Component({
  // Etiqueta del componente.
  selector: 'app-evento-form',
  // Módulo de formularios reactivos y componente de errores.
  imports: [ReactiveFormsModule, CampoErrorComponent],
  // Plantilla HTML.
  templateUrl: './evento-form.component.html',
})
export class EventoFormComponent implements OnChanges {
  /** null: evento nuevo en la ubicación indicada. */
  nodo = input<Nodo | null>(null);
  /** Lugar del lienzo donde se hizo clic (pool, lane y posición). */
  ubicacion = input<Ubicacion | null>(null);
  /** Tipo con el que arranca el formulario al crear (según la herramienta usada: inicio o fin). */
  tipoInicial = input<'INICIO' | 'FIN'>('INICIO');
  /** Lanes del pool para el selector (la lane es opcional en eventos). */
  lanes = input<Lane[]>([]);
  /** Si es false el formulario queda deshabilitado. */
  editable = input<boolean>(true);
  /** true mientras el padre guarda. */
  guardando = input<boolean>(false);
  /** Error de la API, sus errores por campo se pintan en el formulario. */
  problema = input<ProblemDetail | null>(null);

  /** Entrega los datos del evento al padre, que llama a la API. */
  guardar = output<EventoRequest>();

  /** Formulario del evento con sus validadores. */
  eventoForm = new FormGroup({
    tipo: new FormControl<'INICIO' | 'FIN'>('INICIO', { nonNullable: true }),
    // El nombre es opcional, máximo 120 caracteres.
    nombre: new FormControl('', [Validators.maxLength(120)]),
    // A diferencia de la actividad, la lane no es obligatoria.
    laneId: new FormControl<number | null>(null),
    // Posición en el lienzo, entre 0 y 10000.
    posX: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(10000)] }),
    posY: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(10000)] }),
  });

  /** Reacciona a los cambios de los inputs: rellena el formulario, lo habilita o deshabilita y muestra errores del servidor. */
  ngOnChanges(cambios: SimpleChanges): void {
    // Cambió el evento abierto, el lugar del clic o el tipo inicial: se rellena el formulario.
    if (cambios['nodo'] || cambios['ubicacion'] || cambios['tipoInicial']) {
      const nodo = this.nodo();
      const ubicacion = this.ubicacion();
      this.eventoForm.reset({
        // Si es un evento existente se deduce el tipo de su nodo; si es nuevo se usa el tipo inicial.
        tipo: nodo ? (nodo.tipo === 'EVENTO_FIN' ? 'FIN' : 'INICIO') : this.tipoInicial(),
        nombre: nodo?.nombre ?? '',
        laneId: nodo ? nodo.laneId : (ubicacion?.laneId ?? null),
        posX: nodo?.posX ?? ubicacion?.posX ?? 0,
        posY: nodo?.posY ?? ubicacion?.posY ?? 0,
      });
    }
    // Sin permiso de edición se deshabilitan los campos.
    if (cambios['editable']) {
      if (this.editable()) {
        this.eventoForm.enable();
      } else {
        this.eventoForm.disable();
      }
    }
    // Si la API rechazó el guardado, se copian sus errores a los campos.
    const problema = this.problema();
    if (cambios['problema'] && problema) {
      aplicarErroresDelServidor(this.eventoForm, problema);
    }
  }

  /** Al enviar: valida y, si todo está bien, emite los datos al padre. */
  handleSubmit(): void {
    if (this.eventoForm.invalid) {
      // Hace visibles los errores de todos los campos.
      this.eventoForm.markAllAsTouched();
      return;
    }
    const v = this.eventoForm.getRawValue();
    this.guardar.emit({
      tipo: v.tipo,
      // Nombre vacío se envía como null; laneId null significa sin lane.
      nombre: (v.nombre ?? '').trim() || null,
      laneId: v.laneId === null ? null : Number(v.laneId),
      posX: Number(v.posX),
      posY: Number(v.posY),
    });
  }
}
