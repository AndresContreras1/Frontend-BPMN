// computed: valor derivado; OnChanges: Angular lo llama cuando cambia algún input().
import { Component, computed, input, OnChanges, output, SimpleChanges } from '@angular/core';
// Formularios reactivos.
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
// RouterLink: enlace a otra ruta de la app (se usa para ir a crear un rol).
import { RouterLink } from '@angular/router';

// Componente de errores por campo y modelos de datos.
import { CampoErrorComponent } from '../../../../components/campo-error/campo-error.component';
import { Lane } from '../../../../models/lane.model';
import { Pool } from '../../../../models/pool.model';
import { RolProcesoResumen } from '../../../../models/rol-proceso.model';

/**
 * HU-22: agregar una lane eligiendo un rol de proceso del catálogo, o cambiar el rol de una lane.
 * Un pool no repite rol: el select solo ofrece los que aún no tienen lane en ese pool.
 */
@Component({
  // Etiqueta del componente.
  selector: 'app-lane-form',
  // Módulos y componentes que usa la plantilla.
  imports: [ReactiveFormsModule, RouterLink, CampoErrorComponent],
  // Plantilla HTML.
  templateUrl: './lane-form.component.html',
})
export class LaneFormComponent implements OnChanges {
  /** null: lane nueva. */
  lane = input<Lane | null>(null);
  /** Pool donde va la lane (input.required: el padre siempre lo pasa). */
  pool = input.required<Pool>();
  /** Catálogo de roles de proceso. */
  roles = input<RolProcesoResumen[]>([]);
  /** Solo el administrador puede crear roles nuevos; se usa para decidir qué mensaje mostrar si no quedan roles. */
  esAdministrador = input<boolean>(false);
  /** true mientras el padre guarda. */
  guardando = input<boolean>(false);

  /** Entrega el id del rol elegido al padre. */
  guardar = output<number>();
  /** Avisa al padre que el usuario cerró el formulario. */
  cancelar = output<void>();

  /** Formulario con un solo campo: el rol de proceso (obligatorio). */
  laneForm = new FormGroup({
    rolProcesoId: new FormControl<number | null>(null, Validators.required),
  });

  /** Roles que aún se pueden elegir: los que no tienen lane en este pool, más el rol actual de la lane que se edita. */
  rolesDisponibles = computed(() => {
    // Set de ids de rol que ya están usados por alguna lane del pool (búsqueda rápida).
    const usados = new Set(this.pool().lanes.map((l) => l.rolProcesoId));
    // Al editar, el rol que la lane ya tiene debe seguir apareciendo.
    const actual = this.lane()?.rolProcesoId;
    // Se conservan los roles sin usar o el rol actual.
    return this.roles().filter((r) => !usados.has(r.id) || r.id === actual);
  });

  /** Cuando cambia la lane o el pool, reinicia el formulario con el rol actual (o null si es nueva). */
  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['lane'] || cambios['pool']) {
      this.laneForm.reset({ rolProcesoId: this.lane()?.rolProcesoId ?? null });
    }
  }

  /** Al enviar: si no hay rol elegido marca el error; si no, emite el id del rol al padre. */
  handleSubmit(): void {
    const rol = this.laneForm.controls.rolProcesoId.value;
    if (rol === null) {
      this.laneForm.markAllAsTouched();
      return;
    }
    this.guardar.emit(Number(rol));
  }
}
