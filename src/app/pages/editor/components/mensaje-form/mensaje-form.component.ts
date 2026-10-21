// Tipos de los mensajes y de sus peticiones a la API.
// signal: estado reactivo local del componente. OnChanges: Angular lo llama cuando cambia algún input().
import { Component, input, OnChanges, output, signal, SimpleChanges } from '@angular/core';
// Formularios reactivos.
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

// Componente de errores por campo y utilidad que aplica errores del servidor al formulario.
import { CampoErrorComponent } from '../../../../components/campo-error/campo-error.component';
import { aplicarErroresDelServidor } from '../../../../core/services/formularios';
import {
  CampoMensaje, EnvioExternoRequest, Mensaje, MensajeActualizacionRequest, MensajeCatchRequest, MensajeThrowRequest,
  PoliticaFallo, TipoDato, TipoDestinoExterno,
} from '../../../../models/mensaje.model';
// Nodo, variante de evento (inicio, intermedio, fin), pool, error de la API y ubicación del lienzo.
import { Nodo, VarianteEvento } from '../../../../models/nodo.model';
import { Pool } from '../../../../models/pool.model';
import { ProblemDetail } from '../../../../models/problem-detail.model';
import { Ubicacion } from '../../editor.store';

/** Clase de mensaje: THROW (envío a otro pool), CATCH (recepción) o EXTERNO (notificación a un sistema externo). */
export type ClaseMensaje = 'THROW' | 'CATCH' | 'EXTERNO';

/** Lo que el formulario entrega al padre según el caso. */
export type GuardarMensaje =
  | { tipo: 'throw'; datos: MensajeThrowRequest }
  | { tipo: 'catch'; datos: MensajeCatchRequest }
  | { tipo: 'externo'; datos: EnvioExternoRequest }
  | { tipo: 'actualizar'; datos: MensajeActualizacionRequest };

/** Tipos de dato que puede tener cada campo del contenido del mensaje. */
export const TIPOS_DATO: TipoDato[] = ['TEXTO', 'NUMERO', 'DECIMAL', 'FECHA', 'BOOLEANO'];

/**
 * HU-25 (Message Throw hacia otro pool), HU-26 (notificación a un sistema externo, como evento o
 * como tarea, con política si falla) y HU-27 (Message Catch con los datos que recibe y las
 * actividades que los usan). El contenido del mensaje es una lista de campos con su tipo de dato.
 */
@Component({
  // Etiqueta del componente.
  selector: 'app-mensaje-form',
  // Módulo de formularios reactivos y componente de errores.
  imports: [ReactiveFormsModule, CampoErrorComponent],
  // Plantilla HTML.
  templateUrl: './mensaje-form.component.html',
  // Estilos propios del componente.
  styleUrl: './mensaje-form.component.scss',
})
export class MensajeFormComponent implements OnChanges {
  /** null: mensaje nuevo de la clase indicada. */
  mensaje = input<Mensaje | null>(null);
  /** Clase de mensaje a crear (la define la herramienta usada). Si se edita un mensaje se deduce de él. */
  clase = input<ClaseMensaje>('THROW');
  /** Lugar del lienzo donde se hizo clic, para crear el mensaje ahí. */
  ubicacion = input<Ubicacion | null>(null);
  /** Pools del diagrama, para elegir el pool que recibe el mensaje. */
  pools = input<Pool[]>([]);
  /** Nodos del diagrama, para elegir actividades (que usan datos o atienden un fallo). */
  nodos = input<Nodo[]>([]);
  /** Si es false el formulario queda en solo lectura. */
  editable = input<boolean>(true);
  /** true mientras el padre guarda. */
  guardando = input<boolean>(false);
  /** Error de la API; sus errores por campo se pintan en el formulario. */
  problema = input<ProblemDetail | null>(null);

  /** Entrega al padre el mensaje a crear o actualizar, indicando de qué caso se trata. */
  guardar = output<GuardarMensaje>();

  /** Lista de tipos de dato para el selector de cada campo. */
  readonly tiposDato = TIPOS_DATO;

  /** Campos del contenido del mensaje (nombre y tipo). Es un signal y no parte del formulario porque la lista crece y decrece. */
  campos = signal<CampoMensaje[]>([]);
  /** Ids de las actividades que usan los datos de un mensaje recibido (solo para catch). */
  actividadesQueUsan = signal<number[]>([]);
  /** Error de validación propio (reglas que el formulario reactivo no cubre, como campos repetidos). */
  errorLocal = signal('');

  /** Formulario con todos los datos posibles; según la clase de mensaje solo se usan algunos. */
  mensajeForm = new FormGroup({
    // Nombre obligatorio, máximo 120 caracteres: sirve para emparejar el envío con la recepción.
    nombre: new FormControl('', [Validators.required, Validators.maxLength(120)]),
    // Variante del evento: inicio, intermedio o fin.
    variante: new FormControl<VarianteEvento>('INTERMEDIO', { nonNullable: true }),
    // Pool que recibe el mensaje (throw y externo).
    poolDestinoId: new FormControl<number | null>(null),
    // Clave de correlación opcional al crear.
    claveCorrelacion: new FormControl('', [Validators.maxLength(120)]),
    // Solo catch: el mensaje llega de fuera del diagrama.
    origenExterno: new FormControl(false, { nonNullable: true }),
    // Solo externo nuevo: modelarlo como evento o como tarea.
    elemento: new FormControl<'EVENTO' | 'TAREA'>('EVENTO', { nonNullable: true }),
    // Nombre de la tarea cuando el externo se modela como tarea.
    nombreTarea: new FormControl('', [Validators.maxLength(120)]),
    // Canal de la notificación externa.
    tipoDestino: new FormControl<TipoDestinoExterno>('CORREO', { nonNullable: true }),
    // Descripción opcional de cuándo se envía.
    momento: new FormControl('', [Validators.maxLength(300)]),
    // Qué hacer si falla el envío externo.
    politicaFallo: new FormControl<PoliticaFallo>('CONTINUAR', { nonNullable: true }),
    // Actividad que atiende el fallo (si la política es derivar).
    actividadManejoErrorId: new FormControl<number | null>(null),
    // Posición en el lienzo, entre 0 y 10000.
    posX: new FormControl(0, { nonNullable: true, validators: [Validators.min(0), Validators.max(10000)] }),
    posY: new FormControl(0, { nonNullable: true, validators: [Validators.min(0), Validators.max(10000)] }),
  });

  /** La clase del mensaje que se edita, o la de la herramienta si es nuevo. */
  claseActual(): ClaseMensaje {
    const m = this.mensaje();
    if (!m) {
      return this.clase();
    }
    // Un mensaje de recepción es catch; si tiene tipo de destino es externo; el resto son throw.
    if (m.direccion === 'RECEPCION') {
      return 'CATCH';
    }
    return m.tipoDestino ? 'EXTERNO' : 'THROW';
  }

  /** true si no hay mensaje existente: se está creando uno. */
  esNuevo(): boolean {
    return this.mensaje() === null;
  }

  /** La notificación como tarea es una actividad: no tiene variante de evento. */
  esTarea(): boolean {
    const m = this.mensaje();
    return m ? m.nodo.tipo === 'ACTIVIDAD' : this.mensajeForm.controls.elemento.value === 'TAREA';
  }

  /** Pool que envía: el del mensaje existente o el del lugar donde se hizo clic. */
  poolOrigenId(): number | null {
    return this.mensaje()?.poolOrigenId ?? this.ubicacion()?.poolId ?? null;
  }

  /** Throw: cualquier otro pool. Externo: solo pools de caja negra. */
  poolsDestino(): Pool[] {
    const origen = this.poolOrigenId();
    return this.pools().filter((p) => p.id !== origen && (this.claseActual() !== 'EXTERNO' || p.cajaNegra));
  }

  /** Actividades del mismo pool que envía/recibe (opciones para usar datos o atender fallos). */
  actividadesDelPool(): Nodo[] {
    const origen = this.poolOrigenId();
    return this.nodos().filter((n) => n.tipo === 'ACTIVIDAD' && n.poolId === origen);
  }

  /** Variantes de evento permitidas según la clase: un catch puede iniciar el proceso; un throw puede terminarlo. */
  variantes(): { valor: VarianteEvento; texto: string }[] {
    return this.claseActual() === 'CATCH'
      ? [{ valor: 'INICIO', texto: 'De inicio (arranca el proceso)' }, { valor: 'INTERMEDIO', texto: 'Intermedio (espera en medio del flujo)' }]
      : [{ valor: 'INTERMEDIO', texto: 'Intermedio (sigue el flujo)' }, { valor: 'FIN', texto: 'De fin (termina el flujo)' }];
  }

  /** Reacciona a los cambios de los inputs: rellena el formulario, lo habilita o deshabilita y muestra errores del servidor. */
  ngOnChanges(cambios: SimpleChanges): void {
    // Cambió el mensaje, su clase o el lugar del clic: se vuelve a llenar el formulario.
    if (cambios['mensaje'] || cambios['clase'] || cambios['ubicacion']) {
      this.llenar();
    }
    // Sin permiso de edición se deshabilitan los campos.
    if (cambios['editable']) {
      if (this.editable()) {
        this.mensajeForm.enable();
      } else {
        this.mensajeForm.disable();
      }
    }
    // Si la API rechazó el guardado, se copian sus errores a los campos.
    const problema = this.problema();
    if (cambios['problema'] && problema) {
      aplicarErroresDelServidor(this.mensajeForm, problema);
    }
  }

  /** Carga el formulario y las listas con los datos del mensaje existente, o con valores por defecto si es nuevo. */
  private llenar(): void {
    const m = this.mensaje();
    const u = this.ubicacion();
    this.errorLocal.set('');
    // Se copia cada campo con spread ({ ...c }) para no modificar el original al editar.
    this.campos.set(m ? m.campos.map((c) => ({ ...c })) : []);
    this.actividadesQueUsan.set(m ? [...m.actividadesQueUsanIds] : []);
    this.mensajeForm.reset({
      nombre: m?.nombre ?? '',
      variante: m?.nodo.variante ?? 'INTERMEDIO',
      // Por defecto se elige el primer pool posible.
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

  /** Agrega un campo vacío de tipo TEXTO al contenido. update() crea una lista nueva (no se modifica la anterior). */
  agregarCampo(): void {
    this.campos.update((lista) => [...lista, { nombre: '', tipoDato: 'TEXTO' }]);
  }

  /** Quita el campo de esa posición (filter deja todos menos ese). */
  quitarCampo(indice: number): void {
    this.campos.update((lista) => lista.filter((_, i) => i !== indice));
  }

  /** Cambia el nombre o el tipo de un campo, dejando los demás intactos. */
  cambiarCampo(indice: number, cambio: Partial<CampoMensaje>): void {
    this.campos.update((lista) => lista.map((c, i) => (i === indice ? { ...c, ...cambio } : c)));
  }

  /** Marca o desmarca una actividad que usa los datos del mensaje. */
  alternarActividad(id: number, marcada: boolean): void {
    this.actividadesQueUsan.update((ids) => (marcada ? [...ids, id] : ids.filter((x) => x !== id)));
  }

  /** Nombres obligatorios y sin repetir (la API valida lo mismo). */
  // Devuelve el texto del error, o '' si todo está bien.
  private validarCampos(): string {
    // Nombres en minúscula y sin espacios para comparar sin distinguir mayúsculas.
    const nombres = this.campos().map((c) => c.nombre.trim().toLowerCase());
    if (nombres.some((n) => !n)) {
      return 'Cada campo del contenido necesita un nombre.';
    }
    // Un nombre está repetido si su primera aparición no es su propia posición.
    const repetido = nombres.find((n, i) => nombres.indexOf(n) !== i);
    return repetido ? `El campo "${repetido}" está repetido.` : '';
  }

  /**
   * Al enviar: valida el formulario y los campos; luego, si hay mensaje existente emite 'actualizar'; si es nuevo,
   * arma la petición según la clase (throw, catch o externo).
   */
  handleSubmit(): void {
    this.errorLocal.set('');
    // Primero la validación del formulario reactivo.
    if (this.mensajeForm.invalid) {
      this.mensajeForm.markAllAsTouched();
      return;
    }
    // Después la validación propia de los campos del contenido.
    const errorCampos = this.validarCampos();
    if (errorCampos) {
      this.errorLocal.set(errorCampos);
      return;
    }
    // Valores ya limpios para armar la petición (getRawValue incluye campos deshabilitados).
    const v = this.mensajeForm.getRawValue();
    const clase = this.claseActual();
    const campos = this.campos().map((c) => ({ nombre: c.nombre.trim(), tipoDato: c.tipoDato }));
    const nombre = (v.nombre ?? '').trim();
    const destino = v.poolDestinoId === null ? null : Number(v.poolDestinoId);
    // La actividad que atiende el fallo solo cuenta si la política es derivar.
    const manejo = v.politicaFallo === 'DERIVAR_A_ACTIVIDAD' && v.actividadManejoErrorId !== null ? Number(v.actividadManejoErrorId) : null;

    // Reglas: throw y externo necesitan pool destino, y derivar a actividad necesita elegir la actividad.
    if (clase !== 'CATCH' && destino === null) {
      this.errorLocal.set('Elija el pool que recibe el mensaje.');
      return;
    }
    if (clase === 'EXTERNO' && v.politicaFallo === 'DERIVAR_A_ACTIVIDAD' && manejo === null) {
      this.errorLocal.set('Elija la actividad que atiende el fallo.');
      return;
    }

    // Caso 1: mensaje existente -> se actualiza.
    const mensaje = this.mensaje();
    if (mensaje) {
      const datos: MensajeActualizacionRequest = {
        nombre, campos, posX: Number(v.posX), posY: Number(v.posY),
        // Una tarea no tiene variante de evento.
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
      // Se avisa al padre y se termina.
      this.guardar.emit({ tipo: 'actualizar', datos });
      return;
    }

    // Caso 2: mensaje nuevo -> necesita saber dónde se crea.
    const ubicacion = this.ubicacion();
    if (!ubicacion) {
      return;
    }
    // Clave de correlación vacía se envía como null.
    const clave = (v.claveCorrelacion ?? '').trim() || null;
    // THROW: el `!` en destino! es seguro porque ya se validó arriba que no es null.
    if (clase === 'THROW') {
      this.guardar.emit({ tipo: 'throw', datos: {
        poolId: ubicacion.poolId, laneId: ubicacion.laneId, nombre, variante: v.variante, poolDestinoId: destino!,
        campos, claveCorrelacion: clave, posX: ubicacion.posX, posY: ubicacion.posY,
      } });
    } else if (clase === 'CATCH') {
      // CATCH: recepción de mensaje, con sus campos y las actividades que usan los datos.
      this.guardar.emit({ tipo: 'catch', datos: {
        poolId: ubicacion.poolId, laneId: ubicacion.laneId, nombre, variante: v.variante, origenExterno: v.origenExterno,
        campos, actividadesQueUsanIds: this.actividadesQueUsan(), claveCorrelacion: clave, posX: ubicacion.posX, posY: ubicacion.posY,
      } });
    } else {
      // EXTERNO: notificación a un sistema externo (evento o tarea).
      // Si se modela como tarea, es una actividad: necesita lane y nombre.
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
