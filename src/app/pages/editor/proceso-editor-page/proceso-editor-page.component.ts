// Angular: Component, signals (signal/computed), inject() para dependencias; takeUntilDestroyed cancela la suscripción al destruir el componente.
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
// RxJS: finalize (código al terminar), forkJoin (varias peticiones a la vez), map, switchMap (encadena peticiones), tap (efecto lateral).
import { finalize, forkJoin, map, Observable, switchMap, tap } from 'rxjs';

// Componentes compartidos de la app (alertas, modal de confirmar, lienzo SVG del diagrama, etc.).
import { AlertaErrorComponent } from '../../../components/alerta-error/alerta-error.component';
import { ConfirmarModalComponent } from '../../../components/confirmar-modal/confirmar-modal.component';
import { tipoDeElemento } from '../../../components/diagrama/advertencias';
import { DiagramaSvgComponent } from '../../../components/diagrama/diagrama-svg/diagrama-svg.component';
import { EstadoBadgeComponent } from '../../../components/estado-badge/estado-badge.component';
import { PageTitleComponent } from '../../../components/page-title/page-title.component';
import { problemaDe } from '../../../core/services/errores';
import { SesionStore } from '../../../core/services/sesion.store';
// Modelos (tipos de datos) que viajan entre la API y la pantalla.
import { Advertencia, Impacto } from '../../../models/diagrama.model';
import { Lane } from '../../../models/lane.model';
import { CorrelacionRequest } from '../../../models/mensaje.model';
import { ActividadRequest, EventoRequest, GatewayRequest, Nodo } from '../../../models/nodo.model';
import { PermisoEstructura, Pool, PoolRequest } from '../../../models/pool.model';
import { ProblemDetail } from '../../../models/problem-detail.model';
// Servicios que hacen las peticiones HTTP a la API.
import { ActividadService } from '../../../service/actividad.service';
import { ArcoService } from '../../../service/arco.service';
import { DiagramaService } from '../../../service/diagrama.service';
import { EventoService } from '../../../service/evento.service';
import { GatewayService } from '../../../service/gateway.service';
import { LaneService } from '../../../service/lane.service';
import { MensajeService } from '../../../service/mensaje.service';
import { PoolService } from '../../../service/pool.service';
// Paneles y formularios hijos del editor.
import { ActividadFormComponent } from '../components/actividad-form/actividad-form.component';
import { AdvertenciasPanelComponent } from '../components/advertencias-panel/advertencias-panel.component';
import { ArcoFormComponent, DatosArco } from '../components/arco-form/arco-form.component';
import { CorrelacionFormComponent } from '../components/correlacion-form/correlacion-form.component';
import { EstructuraPanelComponent, MovimientoLane } from '../components/estructura-panel/estructura-panel.component';
import { EventoFormComponent } from '../components/evento-form/evento-form.component';
import { GatewayFormComponent } from '../components/gateway-form/gateway-form.component';
import { HerramientasBarraComponent } from '../components/herramientas-barra/herramientas-barra.component';
import { LaneFormComponent } from '../components/lane-form/lane-form.component';
import { ClaseMensaje, GuardarMensaje, MensajeFormComponent } from '../components/mensaje-form/mensaje-form.component';
import { PanelElementoComponent } from '../components/panel-elemento/panel-elemento.component';
import { PoolFormComponent } from '../components/pool-form/pool-form.component';
import { CondicionArco, SalidasGatewayComponent } from '../components/salidas-gateway/salidas-gateway.component';
// Estado compartido del editor y tipo de herramienta.
import { EditorStore, Herramienta } from '../editor.store';
import { Posicion } from '../../../components/diagrama/layout';

/** Datos del modal de confirmación antes de eliminar: textos, advertencias del impacto y la acción a ejecutar si el usuario acepta. */
interface Confirmacion {
  // Título del modal.
  titulo: string;
  // Pregunta que se muestra al usuario.
  mensaje: string;
  // Advertencias que quedarían en el diagrama tras eliminar.
  advertencias: Advertencia[];
  // Función que hace la petición de eliminar (devuelve un Observable).
  accion: () => Observable<unknown>;
  // Mensaje de éxito que se muestra al terminar.
  exito: string;
}

/** Pestañas del panel lateral. */
type Pestana = 'elemento' | 'estructura' | 'advertencias';

/** Título del panel cuando se crea un elemento nuevo, según la herramienta usada. */
const TITULO_NUEVO: Record<string, string> = {
  INICIO: 'Nuevo evento de inicio',
  FIN: 'Nuevo evento de fin',
  ACTIVIDAD: 'Nueva actividad',
  GATEWAY: 'Nuevo gateway',
  THROW: 'Nuevo envío de mensaje',
  CATCH: 'Nueva recepción de mensaje',
  EXTERNO: 'Nueva notificación externa',
};

/** Historias de usuario de cada clase de elemento del diagrama (se muestran en el panel). */
const HISTORIAS: Record<string, string> = {
  INICIO: 'HU-04', FIN: 'HU-04', EVENTO_INICIO: 'HU-04', EVENTO_FIN: 'HU-04',
  ACTIVIDAD: 'HU-08 a HU-10', GATEWAY: 'HU-14 a HU-16', ARCO: 'HU-11 a HU-13',
  THROW: 'HU-25', ENVIO: 'HU-25', EXTERNO: 'HU-26', CATCH: 'HU-27', RECEPCION: 'HU-27',
};

/**
 * Editor del diagrama (HU-08 a HU-16, HU-21 a HU-28). Coordina: carga el diagrama en el EditorStore,
 * recibe los eventos del lienzo y de los paneles hijos, llama a la API y recarga el diagrama para
 * que las advertencias del validador queden al día. Antes de eliminar, muestra el impacto.
 */
@Component({
  // Nombre de la etiqueta del componente.
  selector: 'app-proceso-editor-page',
  // Componentes que la plantilla puede usar (en Angular standalone se declaran aquí).
  imports: [
    RouterLink, PageTitleComponent, AlertaErrorComponent, ConfirmarModalComponent, EstadoBadgeComponent,
    DiagramaSvgComponent, HerramientasBarraComponent, PanelElementoComponent, AdvertenciasPanelComponent,
    EstructuraPanelComponent, PoolFormComponent, LaneFormComponent, EventoFormComponent, ActividadFormComponent,
    GatewayFormComponent, SalidasGatewayComponent, ArcoFormComponent, MensajeFormComponent, CorrelacionFormComponent,
  ],
  // Una instancia nueva del store por cada página del editor (no es global).
  providers: [EditorStore],
  // HTML del componente.
  templateUrl: './proceso-editor-page.component.html',
})
export class ProcesoEditorPageComponent {
  /** Store con el estado del diagrama (público: la plantilla lo lee). */
  readonly store = inject(EditorStore);
  /** Sesión del usuario: sirve para saber si es administrador o puede editar. */
  readonly sesion = inject(SesionStore);
  // Ruta activa: de aquí sale el id del proceso (parámetro de la URL).
  private readonly route = inject(ActivatedRoute);
  // Un servicio de API por cada tipo de elemento que el editor crea, edita o elimina.
  private readonly poolService = inject(PoolService);
  private readonly laneService = inject(LaneService);
  private readonly actividadService = inject(ActividadService);
  private readonly gatewayService = inject(GatewayService);
  private readonly eventoService = inject(EventoService);
  private readonly arcoService = inject(ArcoService);
  private readonly mensajeService = inject(MensajeService);
  private readonly diagramaService = inject(DiagramaService);

  /** true mientras se carga el diagrama. */
  cargando = signal(true);
  /** true mientras hay una petición de guardado en curso (para deshabilitar botones). */
  guardando = signal(false);
  /** true mientras se ejecuta el validador de reglas BPMN. */
  validando = signal(false);
  /** Error o aviso de problema que se muestra en la alerta roja. */
  problema = signal<ProblemDetail | null>(null);
  /** Mensaje de éxito o informativo que se muestra en pantalla. */
  aviso = signal('');
  /** Advertencias que devolvió la API al guardar (gateways y mensajes). */
  avisosGuardado = signal<Advertencia[]>([]);
  /** Modal de confirmación pendiente (null = no hay modal abierto). */
  confirmacion = signal<Confirmacion | null>(null);
  /** Pestaña activa del panel lateral. */
  pestana = signal<Pestana>('elemento');

  /** true si alguna advertencia es de severidad ERROR (entonces el proceso no se puede publicar). */
  hayErrores = computed(() => this.store.advertencias().some((a) => a.severidad === 'ERROR'));

  /** Solo el administrador elimina elementos (la API aplica la misma regla). */
  puedeEliminar = computed(() => this.store.editable() && this.sesion.esAdministrador());

  /** HU-15: arcos que salen del gateway abierto (computed: el arreglo solo cambia si cambia el diagrama). */
  salidasGateway = computed(() => {
    const nodo = this.store.nodoSeleccionado();
    return nodo?.tipo === 'GATEWAY' ? this.store.arcos().filter((a) => a.origenId === nodo.id) : [];
  });

  // Cada vez que cambia el id de la URL se carga el diagrama de ese proceso.
  constructor() {
    // paramMap emite cuando cambian los parámetros de la ruta; map saca el id como número; switchMap cancela la carga anterior si llega otro id; finalize apaga el indicador de carga pase lo que pase.
    this.route.paramMap
      .pipe(
        map((params) => Number(params.get('id'))),
        switchMap((id) => {
          this.cargando.set(true);
          return this.store.cargar(id).pipe(finalize(() => this.cargando.set(false)));
        }),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  // ---------- Datos para la plantilla ----------

  /** Lanes de un pool (lista vacía si no hay pool). */
  lanesDe(poolId: number | null | undefined): Lane[] {
    return poolId ? this.store.lanesDePool(poolId) : [];
  }

  /** Título del panel para un elemento nuevo. */
  tituloNuevo(clase: string): string {
    return TITULO_NUEVO[clase];
  }

  /** Historia de usuario asociada a la clase de elemento ('' si no tiene). */
  historia(clase: string): string {
    return HISTORIAS[clase] ?? '';
  }

  /** Nombre legible del tipo de nodo para mostrar en el panel. */
  tituloNodo(nodo: Nodo): string {
    switch (nodo.tipo) {
      case 'ACTIVIDAD':
        return 'Actividad';
      case 'GATEWAY':
        return 'Gateway';
      case 'EVENTO_INICIO':
        return 'Evento de inicio';
      default:
        return 'Evento de fin';
    }
  }

  /** Convierte el texto de la clase al tipo ClaseMensaje que espera el formulario (solo para el compilador, no cambia el valor). */
  claseMensaje(clase: string): ClaseMensaje {
    return clase as ClaseMensaje;
  }

  // ---------- Herramientas y lienzo ----------

  /** Cambia la herramienta de la barra y limpia el error anterior. */
  cambiarHerramienta(herramienta: Herramienta): void {
    this.store.usarHerramienta(herramienta);
    this.problema.set(null);
  }

  /** Clic en el fondo del lienzo: coloca un elemento nuevo o mueve el seleccionado. */
  alClicLienzo(posicion: Posicion): void {
    // Solo se actúa si el usuario puede editar y la herramienta pone algo en el lienzo (seleccionar y conectar no crean nada).
    const herramienta = this.store.herramienta();
    if (!this.store.editable() || herramienta === 'seleccionar' || herramienta === 'conectar') {
      return;
    }
    // Mover: lleva el elemento seleccionado a este punto.
    if (herramienta === 'mover') {
      this.moverA(posicion);
      return;
    }
    // Regla BPMN: un pool de caja negra no muestra proceso interno, así que no admite elementos.
    if (posicion.pool.cajaNegra) {
      this.avisar('Caja negra', `El pool "${posicion.pool.nombre}" es caja negra: no tiene elementos internos.`);
      return;
    }
    // Regla: actividades y gateways deben estar dentro de una lane.
    if ((herramienta === 'ACTIVIDAD' || herramienta === 'GATEWAY') && !posicion.lane) {
      this.avisar('Falta la lane', 'Las actividades y los gateways van dentro de una lane: agregue una al pool en "Estructura".');
      return;
    }
    this.problema.set(null);
    this.store.seleccionar({
      tipo: 'nuevo',
      clase: herramienta,
      ubicacion: { poolId: posicion.pool.id, laneId: posicion.lane?.id ?? null, posX: posicion.posX, posY: posicion.posY },
    });
    this.pestana.set('elemento');
  }

  /** Clic en un nodo: con la herramienta conectar elige origen y destino del arco; en otro caso abre el nodo (o su mensaje) en el panel. */
  alClicNodo(id: number): void {
    if (this.store.herramienta() === 'conectar' && this.store.editable()) {
      // Primer clic: se guarda el origen (si se vuelve a pulsar el mismo, se cancela). Segundo clic: se abre el formulario del arco nuevo.
      const origen = this.store.origenConexion();
      if (origen === null || origen === id) {
        this.store.marcarOrigenConexion(origen === id ? null : id);
        return;
      }
      this.store.marcarOrigenConexion(null);
      this.store.seleccionar({ tipo: 'arco', id: null, origenId: origen, destinoId: id });
      this.pestana.set('elemento');
      return;
    }
    // Si el nodo pertenece a un mensaje (throw/catch/envío), se abre el formulario de mensaje en vez del de nodo.
    const mensaje = this.store.mensajeDeNodo(id);
    this.store.seleccionar(mensaje ? { tipo: 'mensaje', id: mensaje.id } : { tipo: 'nodo', id });
    this.pestana.set('elemento');
  }

  /** Clic en un arco: lo abre en el panel para editarlo. */
  alClicArco(id: number): void {
    const arco = this.store.arcos().find((a) => a.id === id);
    if (arco) {
      this.store.seleccionar({ tipo: 'arco', id, origenId: arco.origenId, destinoId: arco.destinoId });
      this.pestana.set('elemento');
    }
  }

  /** Clic en un mensaje: lo abre en el panel. */
  alClicMensaje(id: number): void {
    this.store.seleccionar({ tipo: 'mensaje', id });
    this.pestana.set('elemento');
  }

  /** Desde el panel de advertencias: abre el elemento o el arco señalado. */
  irAAdvertencia(advertencia: Advertencia): void {
    // Según el tipo de elemento al que apunta la advertencia se abre el arco o el nodo (si aún existe).
    const tipo = tipoDeElemento(advertencia);
    const id = advertencia.elementoId;
    if (id == null) {
      return;
    }
    if (tipo === 'arco') {
      this.alClicArco(id);
    } else if (tipo === 'nodo' && this.store.nodos().some((n) => n.id === id)) {
      this.alClicNodo(id);
    }
  }

  /** Cierra el panel lateral y limpia errores y avisos del guardado. */
  cerrarPanel(): void {
    this.store.seleccionar(null);
    this.problema.set(null);
    this.avisosGuardado.set([]);
  }

  // ---------- Elementos del flujo (HU-08, HU-09, HU-14, HU-15) ----------

  /** Crea o actualiza un evento (inicio o fin) según lo que esté abierto en el panel. */
  guardarEvento(datos: EventoRequest): void {
    const s = this.store.seleccion();
    if (s?.tipo === 'nuevo') {
      this.ejecutar(this.eventoService.crear(s.ubicacion.poolId, datos), 'Evento agregado.', true);
    } else if (s?.tipo === 'nodo') {
      this.ejecutar(this.eventoService.actualizar(s.id, datos), 'Evento actualizado.', false);
    }
  }

  /** Crea o actualiza una actividad. Al crear, la lane es obligatoria (por eso el `!`). */
  guardarActividad(datos: ActividadRequest): void {
    const s = this.store.seleccion();
    if (s?.tipo === 'nuevo') {
      this.ejecutar(this.actividadService.crear(datos.laneId!, datos), `Actividad "${datos.nombre}" agregada.`, true);
    } else if (s?.tipo === 'nodo') {
      this.ejecutar(this.actividadService.actualizar(s.id, datos), `Actividad "${datos.nombre}" actualizada.`, false);
    }
  }

  /** Crea o actualiza un gateway; guarda las advertencias que devuelve la API (por ejemplo salidas sin condición). */
  guardarGateway(datos: GatewayRequest): void {
    const s = this.store.seleccion();
    const peticion = s?.tipo === 'nuevo'
      ? this.gatewayService.crear(datos.laneId!, datos)
      : s?.tipo === 'nodo' ? this.gatewayService.actualizar(s.id, datos) : null;
    if (peticion) {
      this.ejecutar(peticion.pipe(tap((r) => this.avisosGuardado.set(r.advertencias))), 'Gateway guardado.', s?.tipo === 'nuevo');
    }
  }

  // ---------- Arcos (HU-11, HU-12) ----------

  /** Crea o actualiza un flujo de secuencia entre dos nodos. */
  guardarArco(datos: DatosArco): void {
    const s = this.store.seleccion();
    const proceso = this.store.proceso();
    if (s?.tipo !== 'arco' || !proceso) {
      return;
    }
    // Se arma la petición con el proceso y los datos del formulario (spread `...datos`).
    const arco = { procesoId: proceso.id, ...datos };
    const peticion = s.id === null ? this.arcoService.crear(arco) : this.arcoService.actualizar(s.id, arco);
    this.ejecutar(peticion, s.id === null ? 'Flujo de secuencia agregado.' : 'Flujo de secuencia actualizado.', s.id === null);
  }

  /** HU-15: guarda de una vez las condiciones que cambiaron en las salidas del gateway. */
  guardarCondiciones(cambios: CondicionArco[]): void {
    const proceso = this.store.proceso();
    if (!proceso || !cambios.length) {
      return;
    }
    // Una petición de actualizar por cada condición cambiada; forkJoin las lanza todas juntas.
    const peticiones = cambios.map(({ arco, condicion }) =>
      this.arcoService.actualizar(arco.id, {
        procesoId: proceso.id, origenId: arco.origenId, destinoId: arco.destinoId, etiqueta: arco.etiqueta, condicion,
      }),
    );
    this.ejecutar(forkJoin(peticiones), cambios.length === 1 ? 'Condición actualizada.' : 'Condiciones actualizadas.', false);
  }

  // ---------- Mensajes (HU-25 a HU-28) ----------

  /** Crea o actualiza un mensaje; el tipo del evento decide qué endpoint se llama. */
  guardarMensaje(evento: GuardarMensaje): void {
    const proceso = this.store.proceso();
    const s = this.store.seleccion();
    if (!proceso) {
      return;
    }
    // Según el tipo: throw (envío), catch (recepción), externo (notificación externa) o actualizar uno existente.
    let peticion;
    switch (evento.tipo) {
      case 'throw':
        peticion = this.mensajeService.crearThrow(proceso.id, evento.datos);
        break;
      case 'catch':
        peticion = this.mensajeService.crearCatch(proceso.id, evento.datos);
        break;
      case 'externo':
        peticion = this.mensajeService.crearEnvioExterno(proceso.id, evento.datos);
        break;
      default:
        if (s?.tipo !== 'mensaje') {
          return;
        }
        peticion = this.mensajeService.actualizar(s.id, evento.datos);
    }
    // Todo lo que no sea 'actualizar' es un mensaje nuevo (cierra el panel al terminar).
    const nuevo = evento.tipo !== 'actualizar';
    this.ejecutar(
      peticion.pipe(tap((r) => this.avisosGuardado.set(r.advertencias))),
      nuevo ? `Mensaje "${evento.datos.nombre}" agregado.` : `Mensaje "${evento.datos.nombre}" actualizado.`,
      nuevo,
    );
  }

  /** Define por qué clave se correlaciona (relaciona) un mensaje con su respuesta. */
  guardarCorrelacion(datos: CorrelacionRequest): void {
    const s = this.store.seleccion();
    if (s?.tipo === 'mensaje') {
      this.ejecutar(
        this.mensajeService.definirCorrelacion(s.id, datos).pipe(tap((r) => this.avisosGuardado.set(r.advertencias))),
        `Correlación por "${datos.claveCorrelacion}" guardada.`,
        false,
      );
    }
  }

  // ---------- Mover con clic ----------

  /** Mueve el elemento seleccionado a donde se hizo clic (solo dentro de su pool). */
  private moverA(posicion: Posicion): void {
    // El elemento a mover es el nodo abierto o el nodo de un mensaje.
    const mensaje = this.store.mensajeSeleccionado();
    const nodo = this.store.nodoSeleccionado() ?? mensaje?.nodo ?? null;
    if (!nodo) {
      this.avisar('Elija qué mover', 'Seleccione primero un elemento y luego haga clic donde debe quedar.');
      return;
    }
    // Regla: un elemento no cambia de pool (los arcos no cruzan entre pools).
    if (posicion.pool.id !== nodo.poolId) {
      this.avisar('Fuera de su pool', 'Un elemento solo se mueve dentro de su pool: sus arcos no cruzan a otro pool.');
      return;
    }
    const laneId = posicion.lane?.id ?? null;
    const { posX, posY } = posicion;
    // Según el tipo de elemento se llama a su servicio, repitiendo sus datos y cambiando solo lane y posición.
    let peticion: Observable<unknown>;
    if (mensaje) {
      if (laneId !== nodo.laneId) {
        this.avisar('Misma lane', 'Un mensaje se mueve dentro de su lane.');
        return;
      }
      peticion = this.mensajeService.actualizar(mensaje.id, { nombre: mensaje.nombre, posX, posY });
    } else if (nodo.tipo === 'ACTIVIDAD' || nodo.tipo === 'GATEWAY') {
      if (laneId === null) {
        this.avisar('Falta la lane', 'Las actividades y los gateways quedan dentro de una lane.');
        return;
      }
      peticion = nodo.tipo === 'ACTIVIDAD'
        ? this.actividadService.actualizar(nodo.id, { nombre: nodo.nombre ?? '', tipoActividad: nodo.tipoActividad!, laneId, posX, posY })
        : this.gatewayService.actualizar(nodo.id, { nombre: nodo.nombre, tipoGateway: nodo.tipoGateway!, laneId, posX, posY });
    } else {
      peticion = this.eventoService.actualizar(nodo.id, {
        tipo: nodo.tipo === 'EVENTO_FIN' ? 'FIN' : 'INICIO', nombre: nodo.nombre, laneId, posX, posY,
      });
    }
    this.ejecutar(peticion, 'Elemento movido.', false);
  }

  // ---------- Eliminar con impacto (HU-10, HU-13, HU-16) ----------

  /** Qué se va a eliminar: cómo pedir su impacto, cómo eliminarlo y cómo nombrarlo. */
  private objetivoDeEliminacion(): { impacto: Observable<Impacto>; eliminar: () => Observable<unknown>; nombre: string; arcoPropio?: number } | null {
    const s = this.store.seleccion();
    if (s?.tipo === 'arco' && s.id !== null) {
      const id = s.id;
      return { impacto: this.arcoService.impacto(id), eliminar: () => this.arcoService.eliminar(id), nombre: 'el flujo de secuencia', arcoPropio: id };
    }
    if (s?.tipo === 'mensaje') {
      const nombre = this.store.mensajeSeleccionado()?.nombre ?? '';
      return { impacto: this.mensajeService.impacto(s.id), eliminar: () => this.mensajeService.eliminar(s.id), nombre: `el mensaje "${nombre}"` };
    }
    const nodo = s?.tipo === 'nodo' ? this.store.nodoSeleccionado() : null;
    if (!nodo) {
      return null;
    }
    const servicio = nodo.tipo === 'ACTIVIDAD' ? this.actividadService : nodo.tipo === 'GATEWAY' ? this.gatewayService : this.eventoService;
    return {
      impacto: servicio.impacto(nodo.id),
      eliminar: () => servicio.eliminar(nodo.id),
      nombre: nodo.nombre ? `"${nodo.nombre}"` : `el ${this.tituloNodo(nodo).toLowerCase()}`,
    };
  }

  /** Pide a la API qué pasaría (arcos que se van, advertencias que quedan) y luego confirma. */
  pedirEliminar(): void {
    const objetivo = this.objetivoDeEliminacion();
    if (!objetivo) {
      return;
    }
    this.problema.set(null);
    objetivo.impacto.subscribe({
      next: (resultado) => {
        // Al borrar un arco, la API lo cuenta entre los que se eliminan: no es un "también"
        const arcos = resultado.arcosQueSeEliminan.filter((id) => id !== objetivo.arcoPropio).length;
        this.confirmacion.set({
          titulo: 'Eliminar del diagrama',
          mensaje: `¿Eliminar ${objetivo.nombre}?` + (arcos ? ` También se eliminan ${arcos} ${arcos === 1 ? 'arco conectado' : 'arcos conectados'}.` : ''),
          advertencias: resultado.advertencias,
          accion: objetivo.eliminar,
          exito: 'Elemento eliminado.',
        });
      },
      error: (err) => this.problema.set(problemaDe(err)),
    });
  }

  // ---------- Validar ----------

  /** Ejecuta el validador de reglas BPMN en la API y muestra el resultado en la pestaña de advertencias. */
  validar(): void {
    const proceso = this.store.proceso();
    if (!proceso) {
      return;
    }
    this.validando.set(true);
    this.diagramaService
      .validar(proceso.id)
      // finalize: sea éxito o error, se apaga el indicador.
      .pipe(finalize(() => this.validando.set(false)))
      .subscribe({
        next: (advertencias) => {
          this.store.establecerAdvertencias(advertencias);
          this.pestana.set('advertencias');
          const errores = advertencias.filter((a) => a.severidad === 'ERROR').length;
          this.aviso.set(errores ? `El diagrama tiene ${errores} ${errores === 1 ? 'error' : 'errores'}: no se puede publicar todavía.`
            : 'El diagrama es coherente: se puede publicar.');
        },
        error: (err) => this.problema.set(problemaDe(err)),
      });
  }

  // ---------- Pools y lanes (HU-21, HU-22, HU-24) ----------

  /** Crea o actualiza un pool (seleccion.id null significa nuevo). */
  guardarPool(datos: PoolRequest): void {
    const seleccion = this.store.seleccion();
    const proceso = this.store.proceso();
    if (!proceso || seleccion?.tipo !== 'pool') {
      return;
    }
    const nuevo = seleccion.id === null;
    const peticion = nuevo ? this.poolService.crear(proceso.id, datos) : this.poolService.actualizar(seleccion.id!, datos);
    this.ejecutar(peticion, nuevo ? `Pool "${datos.nombre}" agregado.` : `Pool "${datos.nombre}" actualizado.`, true);
  }

  /** HU-24: el administrador cambia si el editor puede modificar la estructura (pools y lanes). */
  cambiarPermiso(permiso: PermisoEstructura): void {
    const pool = this.store.poolPropietario();
    if (pool) {
      this.ejecutar(this.poolService.cambiarPermisos(pool.id, permiso), 'Permisos de estructura actualizados.', false);
    }
  }

  /** Abre el modal para confirmar la eliminación de un pool. */
  eliminarPool(pool: Pool): void {
    this.confirmacion.set({
      titulo: 'Eliminar pool',
      mensaje: `¿Eliminar el pool "${pool.nombre}" del diagrama?`,
      advertencias: [],
      accion: () => this.poolService.eliminar(pool.id),
      exito: `Pool "${pool.nombre}" eliminado.`,
    });
  }

  /** Crea o actualiza una lane; solo se guarda el rol de proceso que representa. */
  guardarLane(rolProcesoId: number): void {
    const seleccion = this.store.seleccion();
    if (seleccion?.tipo !== 'lane') {
      return;
    }
    const nueva = seleccion.id === null;
    const peticion = nueva
      ? this.laneService.crear(seleccion.poolId, rolProcesoId)
      : this.laneService.actualizar(seleccion.id!, rolProcesoId);
    this.ejecutar(peticion, nueva ? 'Lane agregada.' : 'Rol de la lane actualizado.', true);
  }

  /** Sube o baja una lane: se envía el orden completo del pool. */
  moverLane({ lane, direccion }: MovimientoLane): void {
    const pool = this.store.pools().find((p) => p.id === lane.poolId);
    if (!pool) {
      return;
    }
    // Lista de ids de las lanes en orden actual; se intercambia la lane con su vecina (dirección -1 sube, +1 baja).
    const ids = [...pool.lanes].sort((a, b) => a.orden - b.orden).map((l) => l.id);
    const i = ids.indexOf(lane.id);
    const j = i + direccion;
    // Si no está o ya está en el borde, no se hace nada.
    if (i < 0 || j < 0 || j >= ids.length) {
      return;
    }
    // Intercambio de dos posiciones con desestructuración.
    [ids[i], ids[j]] = [ids[j], ids[i]];
    this.ejecutar(this.laneService.reordenar(pool.id, ids), 'Orden de las lanes actualizado.', false);
  }

  /** Abre el modal para confirmar la eliminación de una lane. */
  eliminarLane(lane: Lane): void {
    this.confirmacion.set({
      titulo: 'Eliminar lane',
      mensaje: `¿Eliminar la lane "${lane.nombre}"? El rol de proceso sigue en el catálogo.`,
      advertencias: [],
      accion: () => this.laneService.eliminar(lane.id),
      exito: `Lane "${lane.nombre}" eliminada.`,
    });
  }

  /** El usuario aceptó el modal: ejecuta la acción guardada y cierra el panel. */
  confirmar(): void {
    const confirmacion = this.confirmacion();
    this.confirmacion.set(null);
    if (confirmacion) {
      this.ejecutar(confirmacion.accion(), confirmacion.exito, true);
    }
  }

  // ---------- Común ----------

  /** Muestra un mensaje de regla incumplida con el mismo formato de error de la API (status 400). */
  private avisar(titulo: string, detalle: string): void {
    this.aviso.set('');
    this.problema.set({ title: titulo, status: 400, detail: detalle });
  }

  /** Hace el cambio y luego recarga el diagrama (switchMap: una petición después de la otra). */
  private ejecutar(peticion: Observable<unknown>, exito: string, cerrarPanel: boolean): void {
    this.guardando.set(true);
    this.problema.set(null);
    this.aviso.set('');
    if (cerrarPanel) {
      this.avisosGuardado.set([]);
    }
    peticion
      .pipe(
        // switchMap: cuando termina el cambio, recién ahí se vuelve a pedir el diagrama.
        switchMap(() => this.store.recargar()),
        // Pase lo que pase (éxito o error) se apaga el indicador de guardado.
        finalize(() => this.guardando.set(false)),
      )
      .subscribe({
        next: () => {
          this.aviso.set(exito);
          if (cerrarPanel) {
            this.store.seleccionar(null);
          }
        },
        error: (err) => this.problema.set(problemaDe(err)),
      });
  }
}
