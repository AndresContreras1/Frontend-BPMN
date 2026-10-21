// OnChanges: método que Angular llama cuando cambia algún input(). SimpleChanges dice cuáles cambiaron.
import { Component, input, OnChanges, output, SimpleChanges } from '@angular/core';
// Formularios reactivos: el formulario se define en TypeScript (FormGroup/FormControl) y se enlaza a la plantilla.
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// Componente que muestra el mensaje de error de un campo, y utilidad que pinta en el formulario los errores de validación que manda la API.
import { CampoErrorComponent } from '../../../../components/campo-error/campo-error.component';
import { aplicarErroresDelServidor } from '../../../../core/services/formularios';
// Modelos de datos y tipo de ubicación del lienzo.
import { Lane } from '../../../../models/lane.model';
import { ActividadRequest, Nodo, TipoActividad } from '../../../../models/nodo.model';
import { ProblemDetail } from '../../../../models/problem-detail.model';
import { Ubicacion } from '../../editor.store';

/** Tipos de actividad BPMN: valor que se envía a la API y texto que ve el usuario en el selector. */
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
  // Etiqueta con la que el padre usa este formulario.
  selector: 'app-actividad-form',
  // ReactiveFormsModule habilita [formGroup] y formControlName en la plantilla.
  imports: [ReactiveFormsModule, CampoErrorComponent],
  // Plantilla HTML del formulario.
  templateUrl: './actividad-form.component.html',
})
export class ActividadFormComponent implements OnChanges {
  /** Actividad que se edita (null cuando se está creando una nueva). */
  nodo = input<Nodo | null>(null);
  /** Lugar del lienzo donde se hizo clic, para crear la actividad ahí (pool, lane y posición). */
  ubicacion = input<Ubicacion | null>(null);
  /** Lanes del pool, para elegir el responsable de la actividad. */
  lanes = input<Lane[]>([]);
  /** Si es false el formulario se deshabilita (solo lectura). */
  editable = input<boolean>(true);
  /** true mientras el padre guarda: deshabilita el botón y muestra el spinner. */
  guardando = input<boolean>(false);
  /** Error que devolvió la API; sus errores por campo se pintan en el formulario. */
  problema = input<ProblemDetail | null>(null);

  /** Avisa al padre con los datos ya limpios cuando el formulario es válido. El padre es quien llama a la API. */
  guardar = output<ActividadRequest>();

  /** Lista de tipos para el @for del selector. */
  readonly tipos = TIPOS_ACTIVIDAD;

  /** Formulario: cada FormControl tiene su valor inicial y sus validadores. */
  actividadForm = new FormGroup({
    // Nombre obligatorio, máximo 120 caracteres.
    nombre: new FormControl('', [Validators.required, Validators.maxLength(120)]),
    // nonNullable: nunca queda en null (al reset vuelve a 'USUARIO'), así el tipo no admite null.
    tipoActividad: new FormControl<TipoActividad>('USUARIO', { nonNullable: true }),
    // La lane es obligatoria: define el rol responsable (regla BPMN del proyecto).
    laneId: new FormControl<number | null>(null, Validators.required),
    // Posición en el lienzo, entre 0 y 10000.
    posX: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(10000)] }),
    posY: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0), Validators.max(10000)] }),
  });

  /** Reacciona a los cambios de los inputs: carga el formulario, activa o desactiva la edición y muestra errores del servidor. */
  ngOnChanges(cambios: SimpleChanges): void {
    // Cambió la actividad abierta o el lugar del clic: se rellena el formulario (con la actividad existente o con valores por defecto).
    if (cambios['nodo'] || cambios['ubicacion']) {
      const nodo = this.nodo();
      const ubicacion = this.ubicacion();
      // reset() carga valores nuevos y limpia estados de tocado/sucio. El `??` usa el valor por defecto si viene null o undefined.
      this.actividadForm.reset({
        nombre: nodo?.nombre ?? '',
        tipoActividad: nodo?.tipoActividad ?? 'USUARIO',
        laneId: nodo ? nodo.laneId : (ubicacion?.laneId ?? null),
        posX: nodo?.posX ?? ubicacion?.posX ?? 0,
        posY: nodo?.posY ?? ubicacion?.posY ?? 0,
      });
    }
    // Sin permiso de edición todos los campos se deshabilitan.
    if (cambios['editable']) {
      if (this.editable()) {
        this.actividadForm.enable();
      } else {
        this.actividadForm.disable();
      }
    }
    // Si la API rechazó el guardado, se copian sus errores a los campos correspondientes.
    const problema = this.problema();
    if (cambios['problema'] && problema) {
      aplicarErroresDelServidor(this.actividadForm, problema);
    }
  }

  /** Al enviar: si hay errores marca todos los campos para mostrarlos; si no, emite los datos al padre. */
  handleSubmit(): void {
    if (this.actividadForm.invalid) {
      // markAllAsTouched hace que se vean los mensajes de error aunque el usuario no haya tocado el campo.
      this.actividadForm.markAllAsTouched();
      return;
    }
    // getRawValue incluye también los campos deshabilitados.
    const v = this.actividadForm.getRawValue();
    this.guardar.emit({
      // trim quita espacios al inicio y al final; Number convierte el valor del input a número.
      nombre: (v.nombre ?? '').trim(),
      tipoActividad: v.tipoActividad,
      laneId: Number(v.laneId),
      posX: Number(v.posX),
      posY: Number(v.posY),
    });
  }
}
