import { Component, input, OnChanges, output, SimpleChanges } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CampoErrorComponent } from '../../../../components/campo-error/campo-error.component';
import { aplicarErroresDelServidor } from '../../../../core/services/formularios';
import { PermisoEstructura, Pool, PoolRequest, TipoPool, TIPOS_POOL_EXTERNO } from '../../../../models/pool.model';
import { ProblemDetail } from '../../../../models/problem-detail.model';

/**
 * HU-21: agregar o editar un pool. El sistema externo siempre es caja negra y el pool de la
 * empresa propietaria nunca lo es (las mismas reglas de la API). HU-24: el administrador define
 * en el pool propietario si el editor puede cambiar la estructura.
 */
@Component({
  selector: 'app-pool-form',
  imports: [ReactiveFormsModule, CampoErrorComponent],
  templateUrl: './pool-form.component.html',
})
export class PoolFormComponent implements OnChanges {
  /** null: pool nuevo. */
  pool = input<Pool | null>(null);
  esAdministrador = input<boolean>(false);
  guardando = input<boolean>(false);
  problema = input<ProblemDetail | null>(null);

  guardar = output<PoolRequest>();
  cambiarPermiso = output<PermisoEstructura>();
  cancelar = output<void>();

  readonly tiposExternos = TIPOS_POOL_EXTERNO;
  readonly etiquetaTipo: Record<TipoPool, string> = {
    PROPIETARIO: 'Empresa propietaria',
    CLIENTE: 'Cliente',
    PROVEEDOR: 'Proveedor',
    SISTEMA_EXTERNO: 'Sistema externo',
  };

  poolForm = new FormGroup({
    nombre: new FormControl('', [Validators.required, Validators.maxLength(120)]),
    tipo: new FormControl<TipoPool>('CLIENTE', { nonNullable: true }),
    cajaNegra: new FormControl(false, { nonNullable: true }),
  });

  permiso = new FormControl<PermisoEstructura>('ADMINISTRADOR_Y_EDITOR', { nonNullable: true });

  constructor() {
    // valueChanges no termina solo: se cancela al destruir el componente
    this.poolForm.controls.tipo.valueChanges.pipe(takeUntilDestroyed()).subscribe((tipo) => this.ajustarCajaNegra(tipo));
  }

  esPropietario(): boolean {
    return this.pool()?.tipo === 'PROPIETARIO';
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['pool']) {
      const pool = this.pool();
      this.poolForm.reset({
        nombre: pool?.nombre ?? '',
        tipo: pool?.tipo ?? 'CLIENTE',
        cajaNegra: pool?.cajaNegra ?? false,
      });
      this.permiso.setValue(pool?.permisoEstructura ?? 'ADMINISTRADOR_Y_EDITOR');
      if (this.esPropietario()) {
        this.poolForm.controls.tipo.disable({ emitEvent: false });
      } else {
        this.poolForm.controls.tipo.enable({ emitEvent: false });
      }
      this.ajustarCajaNegra(this.poolForm.controls.tipo.value);
    }
    const problema = this.problema();
    if (cambios['problema'] && problema) {
      aplicarErroresDelServidor(this.poolForm, problema);
    }
  }

  /** Sistema externo: caja negra fija. Propietario: nunca caja negra. */
  private ajustarCajaNegra(tipo: TipoPool): void {
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

  handleSubmit(): void {
    if (this.poolForm.invalid) {
      this.poolForm.markAllAsTouched();
      return;
    }
    const v = this.poolForm.getRawValue();
    this.guardar.emit({ nombre: (v.nombre ?? '').trim(), tipo: v.tipo, cajaNegra: v.cajaNegra });
  }
}
