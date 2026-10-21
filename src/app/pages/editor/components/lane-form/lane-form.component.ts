import { Component, computed, input, OnChanges, output, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { CampoErrorComponent } from '../../../../components/campo-error/campo-error.component';
import { Lane } from '../../../../models/lane.model';
import { Pool } from '../../../../models/pool.model';
import { RolProcesoResumen } from '../../../../models/rol-proceso.model';

/**
 * HU-22: agregar una lane eligiendo un rol de proceso del catálogo, o cambiar el rol de una lane.
 * Un pool no repite rol: el select solo ofrece los que aún no tienen lane en ese pool.
 */
@Component({
  selector: 'app-lane-form',
  imports: [ReactiveFormsModule, RouterLink, CampoErrorComponent],
  templateUrl: './lane-form.component.html',
})
export class LaneFormComponent implements OnChanges {
  /** null: lane nueva. */
  lane = input<Lane | null>(null);
  pool = input.required<Pool>();
  roles = input<RolProcesoResumen[]>([]);
  esAdministrador = input<boolean>(false);
  guardando = input<boolean>(false);

  guardar = output<number>();
  cancelar = output<void>();

  laneForm = new FormGroup({
    rolProcesoId: new FormControl<number | null>(null, Validators.required),
  });

  rolesDisponibles = computed(() => {
    const usados = new Set(this.pool().lanes.map((l) => l.rolProcesoId));
    const actual = this.lane()?.rolProcesoId;
    return this.roles().filter((r) => !usados.has(r.id) || r.id === actual);
  });

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['lane'] || cambios['pool']) {
      this.laneForm.reset({ rolProcesoId: this.lane()?.rolProcesoId ?? null });
    }
  }

  handleSubmit(): void {
    const rol = this.laneForm.controls.rolProcesoId.value;
    if (rol === null) {
      this.laneForm.markAllAsTouched();
      return;
    }
    this.guardar.emit(Number(rol));
  }
}
