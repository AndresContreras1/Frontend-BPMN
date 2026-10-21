// OnChanges: Angular lo llama cuando cambia algún input().
import { Component, input, OnChanges, output, SimpleChanges } from '@angular/core';
// takeUntilDestroyed: cancela una suscripción cuando el componente se destruye (evita fugas de memoria).
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
// Formularios reactivos.
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// Componente de errores por campo y utilidad que aplica errores del servidor al formulario.
import { CampoErrorComponent } from '../../../../components/campo-error/campo-error.component';
import { aplicarErroresDelServidor } from '../../../../core/services/formularios';
// Tipos del modelo de pool y lista de tipos de participante externos.
import { PermisoEstructura, Pool, PoolRequest, TipoPool, TIPOS_POOL_EXTERNO } from '../../../../models/pool.model';
import { ProblemDetail } from '../../../../models/problem-detail.model';

/**
 * HU-21: agregar o editar un pool. El sistema externo siempre es caja negra y el pool de la
 * empresa propietaria nunca lo es (las mismas reglas de la API). HU-24: el administrador define
 * en el pool propietario si el editor puede cambiar la estructura.
 */
@Component({
  // Etiqueta del componente.
  selector: 'app-pool-form',
  // Módulo de formularios reactivos y componente de errores.
  imports: [ReactiveFormsModule, CampoErrorComponent],
  // Plantilla HTML.
  templateUrl: './pool-form.component.html',
})
export class PoolFormComponent implements OnChanges {
  /** null: pool nuevo. */
  pool = input<Pool | null>(null);
  /** Solo el administrador puede cambiar el permiso de estructura del pool propietario. */
  esAdministrador = input<boolean>(false);
  /** true mientras el padre guarda. */
  guardando = input<boolean>(false);
  /** Error de la API; sus errores por campo se pintan en el formulario. */
  problema = input<ProblemDetail | null>(null);

  /** Entrega los datos del pool al padre, que llama a la API. */
  guardar = output<PoolRequest>();
  /** Pide al padre cambiar el permiso de estructura (HU-24). */
  cambiarPermiso = output<PermisoEstructura>();
  /** Avisa al padre que el usuario cerró el formulario. */
  cancelar = output<void>();

  /** Tipos de participante que el usuario puede elegir (el propietario no se elige). */
  readonly tiposExternos = TIPOS_POOL_EXTERNO;
  /** Texto visible de cada tipo de pool. */
  readonly etiquetaTipo: Record<TipoPool, string> = {
    PROPIETARIO: 'Empresa propietaria',
    CLIENTE: 'Cliente',
    PROVEEDOR: 'Proveedor',
    SISTEMA_EXTERNO: 'Sistema externo',
  };

  /** Formulario del pool. */
  poolForm = new FormGroup({
    // Nombre obligatorio, máximo 120 caracteres.
    nombre: new FormControl('', [Validators.required, Validators.maxLength(120)]),
    // Tipo de participante; por defecto cliente.
    tipo: new FormControl<TipoPool>('CLIENTE', { nonNullable: true }),
    // Caja negra: participante sin detalle interno (sin lanes ni elementos).
    cajaNegra: new FormControl(false, { nonNullable: true }),
  });

  /** Control suelto (fuera del formulario) para el permiso de estructura; se aplica con su propio botón. */
  permiso = new FormControl<PermisoEstructura>('ADMINISTRADOR_Y_EDITOR', { nonNullable: true });

  // Cada vez que cambia el tipo se ajusta la caja negra según las reglas de la API.
  constructor() {
    // valueChanges no termina solo: se cancela al destruir el componente
    this.poolForm.controls.tipo.valueChanges.pipe(takeUntilDestroyed()).subscribe((tipo) => this.ajustarCajaNegra(tipo));
  }

  /** true si se edita el pool de la empresa propietaria. */
  esPropietario(): boolean {
    return this.pool()?.tipo === 'PROPIETARIO';
  }

  /** Cuando cambia el pool, rellena el formulario y el permiso; cuando llega un error de la API, lo pinta en los campos. */
  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['pool']) {
      const pool = this.pool();
      // reset() carga los valores nuevos (o los de un pool nuevo) y limpia los estados del formulario.
      this.poolForm.reset({
        nombre: pool?.nombre ?? '',
        tipo: pool?.tipo ?? 'CLIENTE',
        cajaNegra: pool?.cajaNegra ?? false,
      });
      this.permiso.setValue(pool?.permisoEstructura ?? 'ADMINISTRADOR_Y_EDITOR');
      // El tipo del pool propietario no se puede cambiar. emitEvent: false evita disparar valueChanges mientras se configura.
      if (this.esPropietario()) {
        this.poolForm.controls.tipo.disable({ emitEvent: false });
      } else {
        this.poolForm.controls.tipo.enable({ emitEvent: false });
      }
      // Se aplican de una vez las reglas de caja negra al tipo cargado.
      this.ajustarCajaNegra(this.poolForm.controls.tipo.value);
    }
    // Si la API rechazó el guardado, se copian sus errores a los campos.
    const problema = this.problema();
    if (cambios['problema'] && problema) {
      aplicarErroresDelServidor(this.poolForm, problema);
    }
  }

  /** Sistema externo: caja negra fija. Propietario: nunca caja negra. */
  private ajustarCajaNegra(tipo: TipoPool): void {
    // Referencia al control para cambiarlo y habilitarlo o deshabilitarlo según el tipo.
    const cajaNegra = this.poolForm.controls.cajaNegra;
    if (tipo === 'SISTEMA_EXTERNO') {
      cajaNegra.setValue(true);
      cajaNegra.disable({ emitEvent: false });
    } else if (tipo === 'PROPIETARIO') {
      cajaNegra.setValue(false);
      cajaNegra.disable({ emitEvent: false });
    } else {
      cajaNegra.enable({ emitEvent: false });
    }
  }

  /** Al enviar: valida y, si todo está bien, emite nombre, tipo y caja negra al padre. */
  handleSubmit(): void {
    if (this.poolForm.invalid) {
      // Hace visibles los errores de todos los campos.
      this.poolForm.markAllAsTouched();
      return;
    }
    // getRawValue incluye los campos deshabilitados (tipo del propietario, caja negra fija), que también deben enviarse.
    const v = this.poolForm.getRawValue();
    this.guardar.emit({ nombre: (v.nombre ?? '').trim(), tipo: v.tipo, cajaNegra: v.cajaNegra });
  }
}
