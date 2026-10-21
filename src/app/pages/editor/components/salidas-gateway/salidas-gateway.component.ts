// OnChanges: Angular lo llama cuando cambia algún input().
import { Component, input, OnChanges, output, SimpleChanges } from '@angular/core';
// Formularios reactivos.
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// Componente de errores por campo y modelos de datos.
import { CampoErrorComponent } from '../../../../components/campo-error/campo-error.component';
import { Arco } from '../../../../models/arco.model';
import { Nodo, TipoGateway } from '../../../../models/nodo.model';

/** Nueva condición de un arco que sale del gateway (null la quita). */
// Se exporta porque el padre usa este tipo para guardar los cambios.
export interface CondicionArco {
  // Arco que cambió.
  arco: Arco;
  // Condición nueva (null quita la condición).
  condicion: string | null;
}

/**
 * HU-15: desde el gateway se actualizan las condiciones de cada arco saliente. En un paralelo no hay
 * condiciones (se siguen todos los caminos); en exclusivo e inclusivo cada salida debe tener la suya.
 */
@Component({
  // Etiqueta del componente.
  selector: 'app-salidas-gateway',
  // Módulo de formularios reactivos y componente de errores.
  imports: [ReactiveFormsModule, CampoErrorComponent],
  // Plantilla HTML.
  templateUrl: './salidas-gateway.component.html',
})
export class SalidasGatewayComponent implements OnChanges {
  /** Arcos que salen del gateway abierto. */
  salidas = input<Arco[]>([]);
  /** Todos los nodos, para mostrar el nombre del destino de cada arco. */
  nodos = input<Nodo[]>([]);
  /** Tipo del gateway: define si sus salidas llevan condición. */
  tipoGateway = input<TipoGateway | null>(null);
  /** Si es false los campos quedan deshabilitados. */
  editable = input<boolean>(true);
  /** true mientras el padre guarda. */
  guardando = input<boolean>(false);

  /** Entrega al padre solo las condiciones que cambiaron. */
  guardar = output<CondicionArco[]>();

  /** Un control por arco saliente, con la clave "arco<id>". */
  // Se arma de nuevo cada vez que cambian las salidas (ver ngOnChanges).
  salidasForm = new FormGroup<Record<string, FormControl<string>>>({});

  /** Reconstruye el formulario cuando cambian las salidas y habilita o deshabilita los campos según editable. */
  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['salidas']) {
      // Un control por arco, con su condición actual (o vacío). Máximo 200 caracteres.
      const controles: Record<string, FormControl<string>> = {};
      for (const arco of this.salidas()) {
        controles[this.clave(arco)] = new FormControl(arco.condicion ?? '', {
          nonNullable: true,
          validators: [Validators.maxLength(200)],
        });
      }
      // Se reemplaza el formulario completo (los arcos son dinámicos, no se conocen al escribir el código).
      this.salidasForm = new FormGroup(controles);
    }
    // Se vuelve a aplicar habilitar/deshabilitar porque el formulario nuevo parte habilitado.
    if (cambios['salidas'] || cambios['editable']) {
      if (this.editable()) {
        this.salidasForm.enable();
      } else {
        this.salidasForm.disable();
      }
    }
  }

  /** Nombre del control de un arco (el nombre debe ser texto, no número). */
  clave(arco: Arco): string {
    return `arco${arco.id}`;
  }

  /** true si el gateway es paralelo (sus salidas no llevan condición). */
  esParalelo(): boolean {
    return this.tipoGateway() === 'PARALELO';
  }

  /** Nombre del nodo al que llega el arco, o un texto de respaldo si no tiene nombre o ya no existe. */
  destino(arco: Arco): string {
    const nodo = this.nodos().find((n) => n.id === arco.destinoId);
    return nodo?.nombre || (nodo ? 'elemento sin nombre' : 'elemento eliminado');
  }

  /** Al enviar: valida y emite solo las condiciones que cambiaron respecto a las originales. */
  handleSubmit(): void {
    if (this.salidasForm.invalid) {
      // Hace visibles los errores de todos los campos.
      this.salidasForm.markAllAsTouched();
      return;
    }
    // Valores de todos los controles por clave.
    const valores = this.salidasForm.getRawValue();
    const cambios: CondicionArco[] = [];
    for (const arco of this.salidas()) {
      // trim quita espacios; texto vacío se vuelve null (sin condición).
      const condicion = (valores[this.clave(arco)] ?? '').trim() || null;
      // Solo se agrega a la lista si es distinta de la que ya tenía el arco.
      if (condicion !== (arco.condicion ?? null)) {
        cambios.push({ arco, condicion });
      }
    }
    // Si nada cambió no se avisa al padre.
    if (cambios.length) {
      this.guardar.emit(cambios);
    }
  }
}
