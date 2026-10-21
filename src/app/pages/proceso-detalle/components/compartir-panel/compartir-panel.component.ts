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
  /** Servicio que consulta y guarda la comparticion en la API. */
  private readonly procesoService = inject(ProcesoService);

  /** Id del proceso que se comparte (obligatorio, lo entrega el componente padre). */
  procesoId = input.required<number>();
  /** True si el usuario puede cambiar la comparticion (administrador); si no, solo la ve. */
  editable = input<boolean>(false);
  /** Avisa al padre que la compartición cambió (para recargar el historial). */
  cambio = output<void>();

  /** Ultimo estado de comparticion guardado en el servidor (con los nombres de las empresas). */
  comparticion = signal<Comparticion | null>(null);
  /** Valor del interruptor "Compartir en solo lectura" en pantalla (aun sin guardar). */
  compartido = signal(false);
  /** Lista de NIT que el usuario va armando; se envia completa al guardar. */
  nits = signal<string[]>([]);
  /** True mientras se guarda (deshabilita el boton y muestra spinner). */
  guardando = signal(false);
  /** Error a mostrar en la tarjeta (de la API o de validacion local). */
  problema = signal<ProblemDetail | null>(null);
  /** Mensaje de exito despues de guardar. */
  aviso = signal('');

  /** Campo de texto para escribir un NIT nuevo; valida el formato con PATRON_NIT. */
  nuevoNit = new FormControl('', [Validators.pattern(PATRON_NIT)]);
  /** Texto del error que muestra app-campo-error cuando el NIT no cumple el patron. */
  mensajesNit = { pattern: 'NIT inválido: 5 a 15 dígitos y, opcional, el dígito de verificación (800987654-3)' };

  constructor() {
    // toObservable convierte el input (signal) en un flujo: cada vez que cambia el procesoId se vuelve a consultar.
    // switchMap descarta la peticion anterior si el id cambia antes de que llegue la respuesta.
    toObservable(this.procesoId)
      .pipe(
        switchMap((id) =>
          this.procesoService.comparticion(id).pipe(
            // Si falla, se muestra el error y se emite null para que el flujo siga vivo
            catchError((err) => {
              this.problema.set(problemaDe(err));
              return of(null);
            }),
          ),
        ),
        // Se cancela la suscripcion al destruir el componente
        takeUntilDestroyed(),
      )
      // "c && ..." solo aplica el resultado si no vino null
      .subscribe((c) => c && this.aplicar(c));
  }

  /** Nombre de la empresa si ya está guardada; las recién agregadas aún no lo tienen. */
  nombreDe(nit: string): string | undefined {
    return this.comparticion()?.empresas.find((e) => e.nit === nit)?.nombre;
  }

  /** Agrega el NIT escrito a la lista, si es valido y no esta repetido. */
  agregarNit(): void {
    const nit = (this.nuevoNit.value ?? '').trim();
    // markAsTouched hace que el error de formato se vea en el campo
    this.nuevoNit.markAsTouched();
    if (!nit || this.nuevoNit.invalid) {
      return;
    }
    // Evita duplicados; se crea un arreglo nuevo para que el signal detecte el cambio
    if (!this.nits().includes(nit)) {
      this.nits.update((lista) => [...lista, nit]);
    }
    // Limpia el campo para escribir el siguiente
    this.nuevoNit.reset('');
  }

  /** Saca un NIT de la lista (aun no se guarda hasta pulsar Guardar). */
  quitarNit(nit: string): void {
    this.nits.update((lista) => lista.filter((n) => n !== nit));
  }

  /** Envia a la API el estado del interruptor y los NIT; si se desactiva, manda la lista vacia. */
  guardar(): void {
    this.problema.set(null);
    this.aviso.set('');
    // Validacion local: compartir sin ninguna empresa no tiene sentido, se avisa sin llamar a la API
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
          // Se actualiza la vista con lo que confirmo el servidor y se avisa al padre
          this.aplicar(c);
          this.aviso.set(c.compartido ? 'El proceso quedó compartido en solo lectura.' : 'El proceso dejó de compartirse.');
          this.cambio.emit();
        },
        error: (err) => this.problema.set(problemaDe(err)),
      });
  }

  /** Copia lo que dice el servidor a las signals de la pantalla. */
  private aplicar(c: Comparticion): void {
    this.comparticion.set(c);
    this.compartido.set(c.compartido);
    this.nits.set(c.empresas.map((e) => e.nit));
  }
}
