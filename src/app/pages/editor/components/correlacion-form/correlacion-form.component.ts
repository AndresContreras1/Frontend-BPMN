// OnChanges: Angular lo llama cuando cambia algún input().
import { Component, input, OnChanges, output, SimpleChanges } from '@angular/core';
// Formularios reactivos.
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// Componente de errores por campo y modelos de mensaje.
import { CampoErrorComponent } from '../../../../components/campo-error/campo-error.component';
import { AccionSinCaso, CorrelacionRequest, Mensaje } from '../../../../models/mensaje.model';

/**
 * HU-28: la clave de correlación une el mensaje con el caso correcto del proceso que lo recibe.
 * La API la aplica también al mensaje correspondiente (throw y catch quedan coherentes).
 */
@Component({
  // Etiqueta del componente.
  selector: 'app-correlacion-form',
  // Módulo de formularios reactivos y componente de errores usados en la plantilla.
  imports: [ReactiveFormsModule, CampoErrorComponent],
  // Plantilla HTML.
  templateUrl: './correlacion-form.component.html',
})
export class CorrelacionFormComponent implements OnChanges {
  /** Mensaje al que se le define la correlación (input.required: el padre siempre debe pasarlo). */
  mensaje = input.required<Mensaje>();
  /** Si es false el formulario queda deshabilitado. */
  editable = input<boolean>(true);
  /** true mientras el padre guarda. */
  guardando = input<boolean>(false);

  /** Entrega la correlación al padre, que llama a la API. */
  guardar = output<CorrelacionRequest>();

  /** Formulario con la clave y qué hacer si no hay caso que coincida. */
  correlacionForm = new FormGroup({
    // La clave es obligatoria, máximo 120 caracteres.
    claveCorrelacion: new FormControl('', [Validators.required, Validators.maxLength(120)]),
    // Por defecto se descarta el mensaje; nonNullable evita que quede en null.
    accionSinCaso: new FormControl<AccionSinCaso>('DESCARTAR', { nonNullable: true }),
  });

  /** Cuando cambia el mensaje, rellena el formulario con su correlación actual; cuando cambia editable, lo habilita o deshabilita. */
  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['mensaje']) {
      // `??` usa el valor por defecto cuando el mensaje aún no tiene correlación.
      const m = this.mensaje();
      this.correlacionForm.reset({ claveCorrelacion: m.claveCorrelacion ?? '', accionSinCaso: m.accionSinCaso ?? 'DESCARTAR' });
    }
    if (cambios['editable']) {
      if (this.editable()) {
        this.correlacionForm.enable();
      } else {
        this.correlacionForm.disable();
      }
    }
  }

  /** Al enviar: valida y, si todo está bien, emite la clave (sin espacios sobrantes) y la acción. */
  handleSubmit(): void {
    if (this.correlacionForm.invalid) {
      // Hace visibles los errores de todos los campos.
      this.correlacionForm.markAllAsTouched();
      return;
    }
    const v = this.correlacionForm.getRawValue();
    this.guardar.emit({ claveCorrelacion: (v.claveCorrelacion ?? '').trim(), accionSinCaso: v.accionSinCaso });
  }
}
