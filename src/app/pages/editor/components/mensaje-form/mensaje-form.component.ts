import { Component, input, OnChanges, output, signal, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { CampoErrorComponent } from '../../../../components/campo-error/campo-error.component';
import { aplicarErroresDelServidor } from '../../../../core/services/formularios';
import {
  CampoMensaje, EnvioExternoRequest, Mensaje, MensajeActualizacionRequest, MensajeCatchRequest, MensajeThrowRequest,
  PoliticaFallo, TipoDato, TipoDestinoExterno,
} from '../../../../models/mensaje.model';
import { Nodo, VarianteEvento } from '../../../../models/nodo.model';
import { Pool } from '../../../../models/pool.model';
import { ProblemDetail } from '../../../../models/problem-detail.model';
import { Ubicacion } from '../../editor.store';

export type ClaseMensaje = 'THROW' | 'CATCH' | 'EXTERNO';

/** Lo que el formulario entrega al padre según el caso. */
export type GuardarMensaje =
  | { tipo: 'throw'; datos: MensajeThrowRequest }
  | { tipo: 'catch'; datos: MensajeCatchRequest }
  | { tipo: 'externo'; datos: EnvioExternoRequest }
  | { tipo: 'actualizar'; datos: MensajeActualizacionRequest };

export const TIPOS_DATO: TipoDato[] = ['TEXTO', 'NUMERO', 'DECIMAL', 'FECHA', 'BOOLEANO'];

/**
 * HU-25 (Message Throw hacia otro pool), HU-26 (notificación a un sistema externo, como evento o
 * como tarea, con política si falla) y HU-27 (Message Catch con los datos que recibe y las
 * actividades que los usan). El contenido del mensaje es una lista de campos con su tipo de dato.
 */
@Component({
  selector: 'app-mensaje-form',
  imports: [ReactiveFormsModule, CampoErrorComponent],
  templateUrl: './mensaje-form.component.html',
  styleUrl: './mensaje-form.component.scss',
})
export class MensajeFormComponent implements OnChanges {
  /** null: mensaje nuevo de la clase indicada. */
  mensaje = input<Mensaje | null>(null);
  clase = input<ClaseMensaje>('THROW');
  ubicacion = input<Ubicacion | null>(null);
  pools = input<Pool[]>([]);
  nodos = input<Nodo[]>([]);
  editable = input<boolean>(true);
  guardando = input<boolean>(false);
  problema = input<ProblemDetail | null>(null);

  guardar = output<GuardarMensaje>();

  readonly tiposDato = TIPOS_DATO;

  campos = signal<CampoMensaje[]>([]);
  actividadesQueUsan = signal<number[]>([]);
  errorLocal = signal('');

  mensajeForm = new FormGroup({
    nombre: new FormControl('', [Validators.required, Validators.maxLength(120)]),
    variante: new FormControl<VarianteEvento>('INTERMEDIO', { nonNullable: true }),
    poolDestinoId: new FormControl<number | null>(null),
    claveCorrelacion: new FormControl('', [Validators.maxLength(120)]),
    origenExterno: new FormControl(false, { nonNullable: true }),
    elemento: new FormControl<'EVENTO' | 'TAREA'>('EVENTO', { nonNullable: true }),
    nombreTarea: new FormControl('', [Validators.maxLength(120)]),
    tipoDestino: new FormControl<TipoDestinoExterno>('CORREO', { nonNullable: true }),
    momento: new FormControl('', [Validators.maxLength(300)]),
    politicaFallo: new FormControl<PoliticaFallo>('CONTINUAR', { nonNullable: true }),
    actividadManejoErrorId: new FormControl<number | null>(null),
    posX: new FormControl(0, { nonNullable: true, validators: [Validators.min(0), Validators.max(10000)] }),
    posY: new FormControl(0, { nonNullable: true, validators: [Validators.min(0), Validators.max(10000)] }),
  });

  /** La clase del mensaje que se edita, o la de la herramienta si es nuevo. */
  claseActual(): ClaseMensaje {
    const m = this.mensaje();
    if (!m) {
      return this.clase();
    }
    if (m.direccion === 'RECEPCION') {
      return 'CATCH';
    }
    return m.tipoDestino ? 'EXTERNO' : 'THROW';
  }

  esNuevo(): boolean {
    return this.mensaje() === null;
  }

  /** La notificación como tarea es una actividad: no tiene variante de evento. */
  esTarea(): boolean {
    const m = this.mensaje();
    return m ? m.nodo.tipo === 'ACTIVIDAD' : this.mensajeForm.controls.elemento.value === 'TAREA';
  }

  poolOrigenId(): number | null {
    return this.mensaje()?.poolOrigenId ?? this.ubicacion()?.poolId ?? null;
  }

  /** Throw: cualquier otro pool. Externo: solo pools de caja negra. */
  poolsDestino(): Pool[] {
    const origen = this.poolOrigenId();
    return this.pools().filter((p) => p.id !== origen && (this.claseActual() !== 'EXTERNO' || p.cajaNegra));
  }

  actividadesDelPool(): Nodo[] {
    const origen = this.poolOrigenId();
    return this.nodos().filter((n) => n.tipo === 'ACTIVIDAD' && n.poolId === origen);
  }

  variantes(): { valor: VarianteEvento; texto: string }[] {
    return this.claseActual() === 'CATCH'
      ? [{ valor: 'INICIO', texto: 'De inicio (arranca el proceso)' }, { valor: 'INTERMEDIO', texto: 'Intermedio (espera en medio del flujo)' }]
      : [{ valor: 'INTERMEDIO', texto: 'Intermedio (sigue el flujo)' }, { valor: 'FIN', texto: 'De fin (termina el flujo)' }];
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['mensaje'] || cambios['clase'] || cambios['ubicacion']) {
      this.llenar();
    }
    if (cambios['editable']) {
      if (this.editable()) {
        this.mensajeForm.enable();
      } else {
        this.mensajeForm.disable();
      }
    }
    const problema = this.problema();
    if (cambios['problema'] && problema) {
      aplicarErroresDelServidor(this.mensajeForm, problema);
    }
  }

  private llenar(): void {
    const m = this.mensaje();
    const u = this.ubicacion();
    this.errorLocal.set('');
    this.campos.set(m ? m.campos.map((c) => ({ ...c })) : []);
    this.actividadesQueUsan.set(m ? [...m.actividadesQueUsanIds] : []);
    this.mensajeForm.reset({
      nombre: m?.nombre ?? '',
      variante: m?.nodo.variante ?? 'INTERMEDIO',
      poolDestinoId: m?.poolDestinoId ?? this.poolsDestino()[0]?.id ?? null,
      claveCorrelacion: m?.claveCorrelacion ?? '',
      origenExterno: m?.origenExterno ?? false,
      elemento: m?.nodo.tipo === 'ACTIVIDAD' ? 'TAREA' : 'EVENTO',
      nombreTarea: m?.nodo.tipo === 'ACTIVIDAD' ? (m.nodo.nombre ?? '') : '',
      tipoDestino: m?.tipoDestino ?? 'CORREO',
      momento: m?.momento ?? '',
      politicaFallo: m?.politicaFallo ?? 'CONTINUAR',
      actividadManejoErrorId: m?.actividadManejoErrorId ?? null,
      posX: m?.nodo.posX ?? u?.posX ?? 0,
      posY: m?.nodo.posY ?? u?.posY ?? 0,
    });
  }

  // ---------- Contenido del mensaje (campos) ----------

  agregarCampo(): void {
    this.campos.update((lista) => [...lista, { nombre: '', tipoDato: 'TEXTO' }]);
  }

  quitarCampo(indice: number): void {
    this.campos.update((lista) => lista.filter((_, i) => i !== indice));
  }

  cambiarCampo(indice: number, cambio: Partial<CampoMensaje>): void {
    this.campos.update((lista) => lista.map((c, i) => (i === indice ? { ...c, ...cambio } : c)));
  }

  alternarActividad(id: number, marcada: boolean): void {
    this.actividadesQueUsan.update((ids) => (marcada ? [...ids, id] : ids.filter((x) => x !== id)));
  }

  /** Nombres obligatorios y sin repetir (la API valida lo mismo). */
  private validarCampos(): string {
    const nombres = this.campos().map((c) => c.nombre.trim().toLowerCase());
    if (nombres.some((n) => !n)) {
      return 'Cada campo del contenido necesita un nombre.';
    }
    const repetido = nombres.find((n, i) => nombres.indexOf(n) !== i);
    return repetido ? `El campo "${repetido}" está repetido.` : '';
  }

  handleSubmit(): void {
    this.errorLocal.set('');
    if (this.mensajeForm.invalid) {
      this.mensajeForm.markAllAsTouched();
      return;
    }
    const errorCampos = this.validarCampos();
    if (errorCampos) {
      this.errorLocal.set(errorCampos);
      return;
    }
    const v = this.mensajeForm.getRawValue();
    const clase = this.claseActual();
    const campos = this.campos().map((c) => ({ nombre: c.nombre.trim(), tipoDato: c.tipoDato }));
    const nombre = (v.nombre ?? '').trim();
    const destino = v.poolDestinoId === null ? null : Number(v.poolDestinoId);
    const manejo = v.politicaFallo === 'DERIVAR_A_ACTIVIDAD' && v.actividadManejoErrorId !== null ? Number(v.actividadManejoErrorId) : null;

    if (clase !== 'CATCH' && destino === null) {
      this.errorLocal.set('Elija el pool que recibe el mensaje.');
      return;
    }
    if (clase === 'EXTERNO' && v.politicaFallo === 'DERIVAR_A_ACTIVIDAD' && manejo === null) {
      this.errorLocal.set('Elija la actividad que atiende el fallo.');
      return;
    }

    const mensaje = this.mensaje();
    if (mensaje) {
      const datos: MensajeActualizacionRequest = {
        nombre, campos, posX: Number(v.posX), posY: Number(v.posY),
        variante: this.esTarea() ? null : v.variante,
      };
      if (clase === 'CATCH') {
        datos.origenExterno = v.origenExterno;
        datos.actividadesQueUsanIds = this.actividadesQueUsan();
      } else {
        datos.poolDestinoId = destino;
      }
      if (clase === 'EXTERNO') {
        datos.tipoDestino = v.tipoDestino;
        datos.momento = (v.momento ?? '').trim();
        datos.politicaFallo = v.politicaFallo;
        datos.actividadManejoErrorId = manejo;
      }
      this.guardar.emit({ tipo: 'actualizar', datos });
      return;
    }

    const ubicacion = this.ubicacion();
    if (!ubicacion) {
      return;
    }
    const clave = (v.claveCorrelacion ?? '').trim() || null;
    if (clase === 'THROW') {
      this.guardar.emit({ tipo: 'throw', datos: {
        poolId: ubicacion.poolId, laneId: ubicacion.laneId, nombre, variante: v.variante, poolDestinoId: destino!,
        campos, claveCorrelacion: clave, posX: ubicacion.posX, posY: ubicacion.posY,
      } });
    } else if (clase === 'CATCH') {
      this.guardar.emit({ tipo: 'catch', datos: {
        poolId: ubicacion.poolId, laneId: ubicacion.laneId, nombre, variante: v.variante, origenExterno: v.origenExterno,
        campos, actividadesQueUsanIds: this.actividadesQueUsan(), claveCorrelacion: clave, posX: ubicacion.posX, posY: ubicacion.posY,
      } });
    } else {
      if (v.elemento === 'TAREA' && (!ubicacion.laneId || !(v.nombreTarea ?? '').trim())) {
        this.errorLocal.set('La notificación como tarea necesita una lane y el nombre de la tarea.');
        return;
      }
      this.guardar.emit({ tipo: 'externo', datos: {
        poolId: ubicacion.poolId, laneId: ubicacion.laneId, elemento: v.elemento, nombre,
        nombreTarea: v.elemento === 'TAREA' ? (v.nombreTarea ?? '').trim() : null, poolDestinoId: destino!,
        tipoDestino: v.tipoDestino, campos, momento: (v.momento ?? '').trim() || null, politicaFallo: v.politicaFallo,
        actividadManejoErrorId: manejo, posX: ubicacion.posX, posY: ubicacion.posY,
      } });
    }
  }
}
