import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, map, Observable, switchMap, tap } from 'rxjs';

import { AlertaErrorComponent } from '../../../components/alerta-error/alerta-error.component';
import { ConfirmarModalComponent } from '../../../components/confirmar-modal/confirmar-modal.component';
import { EstadoBadgeComponent } from '../../../components/estado-badge/estado-badge.component';
import { PageTitleComponent } from '../../../components/page-title/page-title.component';
import { problemaDe } from '../../../core/services/errores';
import { SesionStore } from '../../../core/services/sesion.store';
import { Advertencia, Impacto } from '../../../models/diagrama.model';
import { Lane } from '../../../models/lane.model';
import { CorrelacionRequest } from '../../../models/mensaje.model';
import { ActividadRequest, EventoRequest, GatewayRequest, Nodo } from '../../../models/nodo.model';
import { PermisoEstructura, Pool, PoolRequest } from '../../../models/pool.model';
import { ProblemDetail } from '../../../models/problem-detail.model';
import { ActividadService } from '../../../service/actividad.service';
import { ArcoService } from '../../../service/arco.service';
import { DiagramaService } from '../../../service/diagrama.service';
import { EventoService } from '../../../service/evento.service';
import { GatewayService } from '../../../service/gateway.service';
import { LaneService } from '../../../service/lane.service';
import { MensajeService } from '../../../service/mensaje.service';
import { PoolService } from '../../../service/pool.service';
import { tipoDeElemento } from '../advertencias';
import { ActividadFormComponent } from '../components/actividad-form/actividad-form.component';
import { AdvertenciasPanelComponent } from '../components/advertencias-panel/advertencias-panel.component';
import { ArcoFormComponent, DatosArco } from '../components/arco-form/arco-form.component';
import { CorrelacionFormComponent } from '../components/correlacion-form/correlacion-form.component';
import { DiagramaSvgComponent } from '../components/diagrama-svg/diagrama-svg.component';
import { EstructuraPanelComponent, MovimientoLane } from '../components/estructura-panel/estructura-panel.component';
import { EventoFormComponent } from '../components/evento-form/evento-form.component';
import { GatewayFormComponent } from '../components/gateway-form/gateway-form.component';
import { HerramientasBarraComponent } from '../components/herramientas-barra/herramientas-barra.component';
import { LaneFormComponent } from '../components/lane-form/lane-form.component';
import { ClaseMensaje, GuardarMensaje, MensajeFormComponent } from '../components/mensaje-form/mensaje-form.component';
import { PanelElementoComponent } from '../components/panel-elemento/panel-elemento.component';
import { PoolFormComponent } from '../components/pool-form/pool-form.component';
import { EditorStore, Herramienta } from '../editor.store';
import { Posicion } from '../layout';

interface Confirmacion {
  titulo: string;
  mensaje: string;
  advertencias: Advertencia[];
  accion: () => Observable<unknown>;
  exito: string;
}

type Pestana = 'elemento' | 'estructura' | 'advertencias';

const TITULO_NUEVO: Record<string, string> = {
  INICIO: 'Nuevo evento de inicio',
  FIN: 'Nuevo evento de fin',
  ACTIVIDAD: 'Nueva actividad',
  GATEWAY: 'Nuevo gateway',
  THROW: 'Nuevo envío de mensaje',
  CATCH: 'Nueva recepción de mensaje',
  EXTERNO: 'Nueva notificación externa',
};

/**
 * Editor del diagrama (HU-08 a HU-16, HU-21 a HU-28). Coordina: carga el diagrama en el EditorStore,
 * recibe los eventos del lienzo y de los paneles hijos, llama a la API y recarga el diagrama para
 * que las advertencias del validador queden al día. Antes de eliminar, muestra el impacto.
 */
@Component({
  selector: 'app-proceso-editor-page',
  imports: [
    RouterLink, PageTitleComponent, AlertaErrorComponent, ConfirmarModalComponent, EstadoBadgeComponent,
    DiagramaSvgComponent, HerramientasBarraComponent, PanelElementoComponent, AdvertenciasPanelComponent,
    EstructuraPanelComponent, PoolFormComponent, LaneFormComponent, EventoFormComponent, ActividadFormComponent,
    GatewayFormComponent, ArcoFormComponent, MensajeFormComponent, CorrelacionFormComponent,
  ],
  providers: [EditorStore],
  templateUrl: './proceso-editor-page.component.html',
})
export class ProcesoEditorPageComponent {
  readonly store = inject(EditorStore);
  readonly sesion = inject(SesionStore);
  private readonly route = inject(ActivatedRoute);
  private readonly poolService = inject(PoolService);
  private readonly laneService = inject(LaneService);
  private readonly actividadService = inject(ActividadService);
  private readonly gatewayService = inject(GatewayService);
  private readonly eventoService = inject(EventoService);
  private readonly arcoService = inject(ArcoService);
  private readonly mensajeService = inject(MensajeService);
  private readonly diagramaService = inject(DiagramaService);

  cargando = signal(true);
  guardando = signal(false);
  validando = signal(false);
  problema = signal<ProblemDetail | null>(null);
  aviso = signal('');
  /** Advertencias que devolvió la API al guardar (gateways y mensajes). */
  avisosGuardado = signal<Advertencia[]>([]);
  confirmacion = signal<Confirmacion | null>(null);
  pestana = signal<Pestana>('elemento');

  hayErrores = computed(() => this.store.advertencias().some((a) => a.severidad === 'ERROR'));

  /** Solo el administrador elimina elementos (la API aplica la misma regla). */
  puedeEliminar = computed(() => this.store.editable() && this.sesion.esAdministrador());

  constructor() {
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

  lanesDe(poolId: number | null | undefined): Lane[] {
    return poolId ? this.store.lanesDePool(poolId) : [];
  }

  tituloNuevo(clase: string): string {
    return TITULO_NUEVO[clase];
  }

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

  claseMensaje(clase: string): ClaseMensaje {
    return clase as ClaseMensaje;
  }

  // ---------- Herramientas y lienzo ----------

  cambiarHerramienta(herramienta: Herramienta): void {
    this.store.usarHerramienta(herramienta);
    this.problema.set(null);
  }

  /** Clic en el fondo del lienzo: coloca un elemento nuevo o mueve el seleccionado. */
  alClicLienzo(posicion: Posicion): void {
    const herramienta = this.store.herramienta();
    if (!this.store.editable() || herramienta === 'seleccionar' || herramienta === 'conectar') {
      return;
    }
    if (herramienta === 'mover') {
      this.moverA(posicion);
      return;
    }
    if (posicion.pool.cajaNegra) {
      this.avisar('Caja negra', `El pool "${posicion.pool.nombre}" es caja negra: no tiene elementos internos.`);
      return;
    }
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

  alClicNodo(id: number): void {
    if (this.store.herramienta() === 'conectar' && this.store.editable()) {
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
    const mensaje = this.store.mensajeDeNodo(id);
    this.store.seleccionar(mensaje ? { tipo: 'mensaje', id: mensaje.id } : { tipo: 'nodo', id });
    this.pestana.set('elemento');
  }

  alClicArco(id: number): void {
    const arco = this.store.arcos().find((a) => a.id === id);
    if (arco) {
      this.store.seleccionar({ tipo: 'arco', id, origenId: arco.origenId, destinoId: arco.destinoId });
      this.pestana.set('elemento');
    }
  }

  alClicMensaje(id: number): void {
    this.store.seleccionar({ tipo: 'mensaje', id });
    this.pestana.set('elemento');
  }

  /** Desde el panel de advertencias: abre el elemento o el arco señalado. */
  irAAdvertencia(advertencia: Advertencia): void {
    const tipo = tipoDeElemento(advertencia);
    if (tipo === 'arco') {
      this.alClicArco(advertencia.elementoId!);
    } else if (tipo === 'nodo' && this.store.nodos().some((n) => n.id === advertencia.elementoId)) {
      this.alClicNodo(advertencia.elementoId!);
    }
  }

  cerrarPanel(): void {
    this.store.seleccionar(null);
    this.problema.set(null);
    this.avisosGuardado.set([]);
  }

  // ---------- Elementos del flujo (HU-08, HU-09, HU-14, HU-15) ----------

  guardarEvento(datos: EventoRequest): void {
    const s = this.store.seleccion();
    if (s?.tipo === 'nuevo') {
      this.ejecutar(this.eventoService.crear(s.ubicacion.poolId, datos), 'Evento agregado.', true);
    } else if (s?.tipo === 'nodo') {
      this.ejecutar(this.eventoService.actualizar(s.id, datos), 'Evento actualizado.', false);
    }
  }

  guardarActividad(datos: ActividadRequest): void {
    const s = this.store.seleccion();
    if (s?.tipo === 'nuevo') {
      this.ejecutar(this.actividadService.crear(datos.laneId!, datos), `Actividad "${datos.nombre}" agregada.`, true);
    } else if (s?.tipo === 'nodo') {
      this.ejecutar(this.actividadService.actualizar(s.id, datos), `Actividad "${datos.nombre}" actualizada.`, false);
    }
  }

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

  guardarArco(datos: DatosArco): void {
    const s = this.store.seleccion();
    const proceso = this.store.proceso();
    if (s?.tipo !== 'arco' || !proceso) {
      return;
    }
    const arco = { procesoId: proceso.id, ...datos };
    const peticion = s.id === null ? this.arcoService.crear(arco) : this.arcoService.actualizar(s.id, arco);
    this.ejecutar(peticion, s.id === null ? 'Flujo de secuencia agregado.' : 'Flujo de secuencia actualizado.', s.id === null);
  }

  // ---------- Mensajes (HU-25 a HU-28) ----------

  guardarMensaje(evento: GuardarMensaje): void {
    const proceso = this.store.proceso();
    const s = this.store.seleccion();
    if (!proceso) {
      return;
    }
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
    const nuevo = evento.tipo !== 'actualizar';
    this.ejecutar(
      peticion.pipe(tap((r) => this.avisosGuardado.set(r.advertencias))),
      nuevo ? `Mensaje "${evento.datos.nombre}" agregado.` : `Mensaje "${evento.datos.nombre}" actualizado.`,
      nuevo,
    );
  }

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
    const mensaje = this.store.mensajeSeleccionado();
    const nodo = this.store.nodoSeleccionado() ?? mensaje?.nodo ?? null;
    if (!nodo) {
      this.avisar('Elija qué mover', 'Seleccione primero un elemento y luego haga clic donde debe quedar.');
      return;
    }
    if (posicion.pool.id !== nodo.poolId) {
      this.avisar('Fuera de su pool', 'Un elemento solo se mueve dentro de su pool: sus arcos no cruzan a otro pool.');
      return;
    }
    const laneId = posicion.lane?.id ?? null;
    const { posX, posY } = posicion;
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

  validar(): void {
    const proceso = this.store.proceso();
    if (!proceso) {
      return;
    }
    this.validando.set(true);
    this.diagramaService
      .validar(proceso.id)
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

  cambiarPermiso(permiso: PermisoEstructura): void {
    const pool = this.store.poolPropietario();
    if (pool) {
      this.ejecutar(this.poolService.cambiarPermisos(pool.id, permiso), 'Permisos de estructura actualizados.', false);
    }
  }

  eliminarPool(pool: Pool): void {
    this.confirmacion.set({
      titulo: 'Eliminar pool',
      mensaje: `¿Eliminar el pool "${pool.nombre}" del diagrama?`,
      advertencias: [],
      accion: () => this.poolService.eliminar(pool.id),
      exito: `Pool "${pool.nombre}" eliminado.`,
    });
  }

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
    const ids = [...pool.lanes].sort((a, b) => a.orden - b.orden).map((l) => l.id);
    const i = ids.indexOf(lane.id);
    const j = i + direccion;
    if (i < 0 || j < 0 || j >= ids.length) {
      return;
    }
    [ids[i], ids[j]] = [ids[j], ids[i]];
    this.ejecutar(this.laneService.reordenar(pool.id, ids), 'Orden de las lanes actualizado.', false);
  }

  eliminarLane(lane: Lane): void {
    this.confirmacion.set({
      titulo: 'Eliminar lane',
      mensaje: `¿Eliminar la lane "${lane.nombre}"? El rol de proceso sigue en el catálogo.`,
      advertencias: [],
      accion: () => this.laneService.eliminar(lane.id),
      exito: `Lane "${lane.nombre}" eliminada.`,
    });
  }

  confirmar(): void {
    const confirmacion = this.confirmacion();
    this.confirmacion.set(null);
    if (confirmacion) {
      this.ejecutar(confirmacion.accion(), confirmacion.exito, true);
    }
  }

  // ---------- Común ----------

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
        switchMap(() => this.store.recargar()),
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
