import { Component, input, OnChanges, output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CampoErrorComponent } from '../../../../components/campo-error/campo-error.component';
import { AccionSinCaso, CorrelacionRequest, Mensaje } from '../../../../models/mensaje.model';

/**
 * HU-28: la clave de correlación une el mensaje con el caso correcto del proceso que lo recibe.
 * La API la aplica también al mensaje correspondiente (throw y catch quedan coherentes).
 */
@Component({
  selector: 'app-correlacion-form',
  imports: [ReactiveFormsModule, CampoErrorComponent],
  templateUrl: './correlacion-form.component.html',
})
export class CorrelacionFormComponent implements OnChanges {
  mensaje = input.required<Mensaje>();
  editable = input<boolean>(true);
  guardando = input<boolean>(false);

  guardar = output<CorrelacionRequest>();

  correlacionForm = new FormGroup({
    claveCorrelacion: new FormControl('', [Validators.required, Validators.maxLength(120)]),
    accionSinCaso: new FormControl<AccionSinCaso>('DESCARTAR', { nonNullable: true }),
  });

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['mensaje']) {
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

  handleSubmit(): void {
    if (this.correlacionForm.invalid) {
      this.correlacionForm.markAllAsTouched();
      return;
    }
    const v = this.correlacionForm.getRawValue();
    this.guardar.emit({ claveCorrelacion: (v.claveCorrelacion ?? '').trim(), accionSinCaso: v.accionSinCaso });
  }
}
