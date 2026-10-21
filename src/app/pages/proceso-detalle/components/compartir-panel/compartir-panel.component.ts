import { Component, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { catchError, finalize, of, switchMap } from 'rxjs';

import { CampoErrorComponent } from '../../../../components/campo-error/campo-error.component';
import { problemaDe } from '../../../../core/services/errores';
import { PATRON_NIT } from '../../../../models/empresa.model';
import { ProblemDetail } from '../../../../models/problem-detail.model';
import { Comparticion } from '../../../../models/proceso.model';
import { ProcesoService } from '../../../../service/proceso.service';

/**
 * HU-23: compartir el proceso en solo lectura con otras empresas, identificadas por su NIT.
 * Solo el administrador de la empresa dueña lo cambia; los demás ven con quién está compartido.
 */
@Component({
  selector: 'app-compartir-panel',
  imports: [ReactiveFormsModule, CampoErrorComponent],
  templateUrl: './compartir-panel.component.html',
})
export class CompartirPanelComponent {
  private readonly procesoService = inject(ProcesoService);

  procesoId = input.required<number>();
  editable = input<boolean>(false);
  /** Avisa al padre que la compartición cambió (para recargar el historial). */
  cambio = output<void>();

  comparticion = signal<Comparticion | null>(null);
  compartido = signal(false);
  nits = signal<string[]>([]);
  guardando = signal(false);
  problema = signal<ProblemDetail | null>(null);
  aviso = signal('');

  nuevoNit = new FormControl('', [Validators.pattern(PATRON_NIT)]);
  mensajesNit = { pattern: 'NIT inválido: 5 a 15 dígitos y, opcional, el dígito de verificación (800987654-3)' };

  constructor() {
    toObservable(this.procesoId)
      .pipe(
        switchMap((id) =>
          this.procesoService.comparticion(id).pipe(
            catchError((err) => {
              this.problema.set(problemaDe(err));
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((c) => c && this.aplicar(c));
  }

  /** Nombre de la empresa si ya está guardada; las recién agregadas aún no lo tienen. */
  nombreDe(nit: string): string | undefined {
    return this.comparticion()?.empresas.find((e) => e.nit === nit)?.nombre;
  }

  agregarNit(): void {
    const nit = (this.nuevoNit.value ?? '').trim();
    this.nuevoNit.markAsTouched();
    if (!nit || this.nuevoNit.invalid) {
      return;
    }
    if (!this.nits().includes(nit)) {
      this.nits.update((lista) => [...lista, nit]);
    }
    this.nuevoNit.reset('');
  }

  quitarNit(nit: string): void {
    this.nits.update((lista) => lista.filter((n) => n !== nit));
  }

  guardar(): void {
    this.problema.set(null);
    this.aviso.set('');
    if (this.compartido() && this.nits().length === 0) {
      this.problema.set({ title: 'Faltan empresas', status: 400, detail: 'Agregue al menos el NIT de una empresa.' });
      return;
    }
    this.guardando.set(true);
    this.procesoService
      .compartir(this.procesoId(), this.compartido(), this.compartido() ? this.nits() : [])
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe({
        next: (c) => {
          this.aplicar(c);
          this.aviso.set(c.compartido ? 'El proceso quedó compartido en solo lectura.' : 'El proceso dejó de compartirse.');
          this.cambio.emit();
        },
        error: (err) => this.problema.set(problemaDe(err)),
      });
  }

  private aplicar(c: Comparticion): void {
    this.comparticion.set(c);
    this.compartido.set(c.compartido);
    this.nits.set(c.empresas.map((e) => e.nit));
  }
}
