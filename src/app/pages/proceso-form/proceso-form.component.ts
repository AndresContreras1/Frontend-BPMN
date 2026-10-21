import { Component, inject, OnInit, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, Observable, of } from 'rxjs';

import { AlertaErrorComponent } from '../../components/alerta-error/alerta-error.component';
import { CampoErrorComponent } from '../../components/campo-error/campo-error.component';
import { PageTitleComponent } from '../../components/page-title/page-title.component';
import { problemaDe } from '../../core/services/errores';
import { aplicarErroresDelServidor } from '../../core/services/formularios';
import { ProblemDetail } from '../../models/problem-detail.model';
import { EstadoProceso, Proceso } from '../../models/proceso.model';
import { ProcesoService } from '../../service/proceso.service';

/**
 * HU-04 (crear) y HU-05 (editar) en un solo componente: la ruta procesos/nuevo crea y
 * procesos/editar/:id carga el proceso con patchValue. El proceso nace en BORRADOR; al editar se
 * puede publicar, y la API lo rechaza (409 con los motivos) si el diagrama no es coherente.
 */
@Component({
  selector: 'app-proceso-form',
  imports: [ReactiveFormsModule, RouterLink, PageTitleComponent, AlertaErrorComponent, CampoErrorComponent],
  templateUrl: './proceso-form.component.html',
})
export class ProcesoFormComponent implements OnInit {
  private readonly procesoService = inject(ProcesoService);
  private readonly router = inject(Router);
  private readonly activedRoute = inject(ActivatedRoute);

  procesoId: number | undefined = undefined;
  isEdit = false;
  /** Versión leída: si otro usuario guardó antes, la API responde 409 (conflicto de edición). */
  private version: number | undefined;

  cargando = signal(false);
  enviando = signal(false);
  problema = signal<ProblemDetail | null>(null);
  /** Motivo por el que el proceso no se puede editar (compartido o eliminado). */
  soloLectura = signal('');

  categorias = toSignal(this.procesoService.categorias().pipe(catchError(() => of([] as string[]))), {
    initialValue: [] as string[],
  });

  procesoForm = new FormGroup({
    nombre: new FormControl('', [Validators.required, Validators.maxLength(120)]),
    descripcion: new FormControl('', [Validators.maxLength(500)]),
    categoria: new FormControl('', [Validators.required, Validators.maxLength(60)]),
    estado: new FormControl<EstadoProceso>('BORRADOR', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.procesoId = Number(this.activedRoute.snapshot.params['id']);
    if (this.procesoId) {
      this.isEdit = true;
      this.cargando.set(true);
      this.procesoService
        .obtener(this.procesoId)
        .pipe(finalize(() => this.cargando.set(false)))
        .subscribe({
          next: (proceso) => this.llenar(proceso),
          error: (err) => this.problema.set(problemaDe(err)),
        });
    }
  }

  private llenar(proceso: Proceso): void {
    this.version = proceso.version;
    this.procesoForm.patchValue({
      nombre: proceso.nombre,
      descripcion: proceso.descripcion ?? '',
      categoria: proceso.categoria,
      estado: proceso.estado,
    });
    if (!proceso.propio) {
      this.soloLectura.set('Este proceso lo compartió otra empresa: solo se puede consultar.');
    } else if (!proceso.activo) {
      this.soloLectura.set('Este proceso está eliminado: se conserva para consulta, pero ya no se edita.');
    }
    if (this.soloLectura()) {
      this.procesoForm.disable();
    }
  }

  handleSubmit(): void {
    if (this.procesoForm.invalid) {
      this.procesoForm.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.problema.set(null);
    const v = this.procesoForm.getRawValue();
    const datos = {
      nombre: (v.nombre ?? '').trim(),
      descripcion: (v.descripcion ?? '').trim() || null,
      categoria: (v.categoria ?? '').trim(),
    };

    const peticion: Observable<Proceso> = this.isEdit
      ? this.procesoService.actualizar(this.procesoId!, { ...datos, estado: v.estado, version: this.version })
      : this.procesoService.crear(datos);

    peticion.pipe(finalize(() => this.enviando.set(false))).subscribe({
      // Se navega dentro del subscribe: primero se guarda, luego se muestra el detalle
      next: (proceso) => this.router.navigate(['/procesos', proceso.id]),
      error: (err) => {
        const problema = problemaDe(err);
        aplicarErroresDelServidor(this.procesoForm, problema);
        this.problema.set(problema);
      },
    });
  }
}
