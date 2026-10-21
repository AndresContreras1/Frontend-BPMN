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
import { NotificacionesService } from '../../core/services/notificaciones.service';
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
  // Modulo de formularios reactivos + lo que el HTML usa (enlace, titulo, alerta y mensajes de error de campo)
  imports: [ReactiveFormsModule, RouterLink, PageTitleComponent, AlertaErrorComponent, CampoErrorComponent],
  templateUrl: './proceso-form.component.html',
})
export class ProcesoFormComponent implements OnInit {
  /** Servicio que habla con la API de procesos. */
  private readonly procesoService = inject(ProcesoService);
  /** Para navegar al detalle despues de guardar. */
  private readonly router = inject(Router);
  /** Muestra mensajes de exito (toast) al usuario. */
  private readonly notificaciones = inject(NotificacionesService);
  /** Permite leer el id de la URL cuando se esta editando. */
  private readonly activedRoute = inject(ActivatedRoute);

  /** Id del proceso que se edita; queda sin valor (o NaN) cuando se esta creando. */
  procesoId: number | undefined = undefined;
  /** True si estamos editando un proceso existente; false si es uno nuevo. */
  isEdit = false;
  /** Versión leída: si otro usuario guardó antes, la API responde 409 (conflicto de edición). */
  private version: number | undefined;

  /** True mientras se carga el proceso a editar (oculta el formulario y muestra spinner). */
  cargando = signal(false);
  /** True mientras se envia el formulario (deshabilita el boton de guardar). */
  enviando = signal(false);
  /** Error devuelto por la API para mostrarlo en la alerta. */
  problema = signal<ProblemDetail | null>(null);
  /** Motivo por el que el proceso no se puede editar (compartido o eliminado). */
  soloLectura = signal('');

  /**
   * Categorias ya usadas, para sugerirlas en el campo de categoria (datalist).
   * toSignal convierte el observable en signal; si la peticion falla se usa una lista vacia.
   */
  categorias = toSignal(this.procesoService.categorias().pipe(catchError(() => of([] as string[]))), {
    initialValue: [] as string[],
  });

  /** Formulario reactivo con sus validaciones (los maximos coinciden con los de la API). */
  procesoForm = new FormGroup({
    nombre: new FormControl('', [Validators.required, Validators.maxLength(120)]),
    descripcion: new FormControl('', [Validators.maxLength(500)]),
    categoria: new FormControl('', [Validators.required, Validators.maxLength(60)]),
    // nonNullable: nunca vale null, y si se resetea vuelve a BORRADOR
    estado: new FormControl<EstadoProceso>('BORRADOR', { nonNullable: true }),
  });

  /** Al iniciar: si la URL trae un id se pasa a modo edicion y se carga el proceso. */
  ngOnInit(): void {
    // En /procesos/nuevo no hay id, Number(undefined) da NaN y NaN cuenta como falso en el if
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

  /** Copia el proceso cargado al formulario y lo bloquea si no se puede editar. */
  private llenar(proceso: Proceso): void {
    // Se guarda la version para enviarla al actualizar (control de edicion concurrente)
    this.version = proceso.version;
    // patchValue rellena los campos del formulario con los datos del proceso
    this.procesoForm.patchValue({
      nombre: proceso.nombre,
      descripcion: proceso.descripcion ?? '',
      categoria: proceso.categoria,
      estado: proceso.estado,
    });
    // Se decide el motivo de solo lectura: de otra empresa o ya eliminado
    if (!proceso.propio) {
      this.soloLectura.set('Este proceso lo compartió otra empresa: solo se puede consultar.');
    } else if (!proceso.activo) {
      this.soloLectura.set('Este proceso está eliminado: se conserva para consulta, pero ya no se edita.');
    }
    // Si hay motivo, se deshabilitan todos los campos
    if (this.soloLectura()) {
      this.procesoForm.disable();
    }
  }

  /** Envia el formulario: crea el proceso nuevo o actualiza el existente. */
  handleSubmit(): void {
    // Si hay campos invalidos se marcan como tocados para que se vean los errores y no se envia nada
    if (this.procesoForm.invalid) {
      this.procesoForm.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.problema.set(null);
    // getRawValue incluye tambien los campos deshabilitados
    const v = this.procesoForm.getRawValue();
    // Se limpian espacios; una descripcion vacia se envia como null
    const datos = {
      nombre: (v.nombre ?? '').trim(),
      descripcion: (v.descripcion ?? '').trim() || null,
      categoria: (v.categoria ?? '').trim(),
    };

    // Segun el modo se arma la peticion de actualizar (con estado y version) o la de crear
    const peticion: Observable<Proceso> = this.isEdit
      ? this.procesoService.actualizar(this.procesoId!, { ...datos, estado: v.estado, version: this.version })
      : this.procesoService.crear(datos);

    peticion.pipe(finalize(() => this.enviando.set(false))).subscribe({
      // Se navega dentro del subscribe: primero se guarda, luego se muestra el detalle
      next: (proceso) => {
        this.notificaciones.exito(this.isEdit ? `Se guardaron los cambios de "${proceso.nombre}".` : `Proceso "${proceso.nombre}" creado en borrador.`);
        this.router.navigate(['/procesos', proceso.id]);
      },
      error: (err) => {
        const problema = problemaDe(err);
        // Los errores por campo que reporta la API se pintan en cada campo del formulario
        aplicarErroresDelServidor(this.procesoForm, problema);
        this.problema.set(problema);
      },
    });
  }
}
