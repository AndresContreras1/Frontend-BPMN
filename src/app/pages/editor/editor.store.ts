// Signals: valores reactivos; computed: valores derivados que se recalculan solos. Injectable: servicio de Angular.
import { computed, inject, Injectable, signal } from '@angular/core';
// Operadores RxJS: forkJoin junta varias peticiones, map transforma, tap hace un efecto sin cambiar el valor, catchError atrapa errores.
import { catchError, forkJoin, map, Observable, of, tap } from 'rxjs';

// Utilidades, modelos y servicios de la API que usa el store.
import { problemaDe } from '../../core/services/errores';
import { SesionStore } from '../../core/services/sesion.store';
import { Advertencia, Diagrama } from '../../models/diagrama.model';
import { ProblemDetail } from '../../models/problem-detail.model';
import { RolProcesoResumen } from '../../models/rol-proceso.model';
import { DiagramaService } from '../../service/diagrama.service';
import { RolProcesoService } from '../../service/rol-proceso.service';

/** Elementos que se crean con un clic en el lienzo. */
export type ClaseElemento = 'INICIO' | 'FIN' | 'ACTIVIDAD' | 'GATEWAY' | 'THROW' | 'CATCH' | 'EXTERNO';

/** Qué hace el próximo clic en el lienzo. */
export type Herramienta = 'seleccionar' | 'conectar' | 'mover' | ClaseElemento;

/** Lugar del lienzo donde va un elemento nuevo (pool, lane y posición). */
export interface Ubicacion {
  poolId: number;
  laneId: number | null;
  posX: number;
  posY: number;
}

/** Qué está abierto en el panel lateral; id null significa "nuevo". */
export type Seleccion =
  | { tipo: 'pool'; id: number | null }
  | { tipo: 'lane'; id: number | null; poolId: number }
  | { tipo: 'nodo'; id: number }
  | { tipo: 'mensaje'; id: number }
  | { tipo: 'arco'; id: number | null; origenId: number; destinoId: number }
  | { tipo: 'nuevo'; clase: ClaseElemento; ubicacion: Ubicacion };

/**
 * Estado compartido del editor (un servicio por página: va en providers del componente).
 * Guarda el diagrama con signals de solo lectura hacia afuera; los componentes hijos reciben
 * los datos por input() y avisan con output().
 */
@Injectable()
export class EditorStore {
  // Servicios inyectados con inject(): uno para el diagrama, otro para el catálogo de roles y el de la sesión (permisos del usuario).
  private readonly diagramaService = inject(DiagramaService);
  private readonly rolProcesoService = inject(RolProcesoService);
  private readonly sesion = inject(SesionStore);

  // Estado privado y escribible (con guion bajo). Solo el store lo modifica; hacia afuera se expone la versión de solo lectura.
  /** Diagrama completo del proceso (pools, nodos, arcos, mensajes, advertencias); null mientras no carga. */
  private readonly _diagrama = signal<Diagrama | null>(null);
  /** Catálogo de roles de proceso, para elegir el rol de cada lane. */
  private readonly _roles = signal<RolProcesoResumen[]>([]);
  /** Error de la API si falló la carga inicial (se muestra en pantalla). */
  private readonly _problemaCarga = signal<ProblemDetail | null>(null);
  /** Qué elemento está abierto en el panel lateral (null = ninguno). */
  private readonly _seleccion = signal<Seleccion | null>(null);
  /** Herramienta activa de la barra: define qué hace el próximo clic en el lienzo. */
  private readonly _herramienta = signal<Herramienta>('seleccionar');
  /** Id del primer nodo elegido al conectar dos elementos (null = aún no se eligió). */
  private readonly _origenConexion = signal<number | null>(null);

  // asReadonly(): los componentes pueden leer el signal pero no cambiarlo; para cambiarlo deben usar los métodos del store.
  /** Diagrama actual (solo lectura). */
  readonly diagrama = this._diagrama.asReadonly();
  /** Roles disponibles (solo lectura). */
  readonly roles = this._roles.asReadonly();
  /** Problema de carga (solo lectura). */
  readonly problemaCarga = this._problemaCarga.asReadonly();
  /** Selección actual del panel (solo lectura). */
  readonly seleccion = this._seleccion.asReadonly();
  /** Herramienta activa (solo lectura). */
  readonly herramienta = this._herramienta.asReadonly();
  /** Primer elemento elegido con la herramienta "conectar". */
  readonly origenConexion = this._origenConexion.asReadonly();

  // Los computed siguientes sacan partes del diagrama; el `?? valor` evita errores cuando todavía no hay diagrama.
  /** Datos del proceso (nombre, estado, si es propio, etc.). */
  readonly proceso = computed(() => this._diagrama()?.proceso ?? null);
  /** Pools ordenados por su campo orden. Se copia el arreglo con [...] antes de sort() para no modificar el original. */
  readonly pools = computed(() => [...(this._diagrama()?.pools ?? [])].sort((a, b) => a.orden - b.orden));
  /** Todos los elementos del flujo (actividades, gateways, eventos). */
  readonly nodos = computed(() => this._diagrama()?.nodos ?? []);
  /** Flujos de secuencia que conectan los nodos. */
  readonly arcos = computed(() => this._diagrama()?.arcos ?? []);
  /** Mensajes entre pools (envíos, recepciones y notificaciones externas). */
  readonly mensajes = computed(() => this._diagrama()?.mensajes ?? []);
  /** Advertencias del validador de reglas BPMN. */
  readonly advertencias = computed(() => this._diagrama()?.advertencias ?? []);
  /** Pool de tipo PROPIETARIO: el pool de la propia organización (null si no existe). */
  readonly poolPropietario = computed(() => this.pools().find((p) => p.tipo === 'PROPIETARIO') ?? null);

  /** Proceso propio, activo y usuario administrador o editor. */
  readonly editable = computed(() => {
    // `!!p` convierte a booleano: hay proceso. Debe ser propio, estar activo y el usuario con rol para editar.
    const p = this.proceso();
    return !!p && p.propio && p.activo && this.sesion.puedeEditar();
  });

  /** HU-24: el editor cambia pools y lanes solo si el administrador lo permite. */
  readonly estructuraEditable = computed(
    () => this.editable() && (this.sesion.esAdministrador() || this.poolPropietario()?.permisoEstructura !== 'SOLO_ADMINISTRADOR'),
  );

  /** Pool abierto en el panel; null si no hay selección de pool o es uno nuevo (id null). */
  readonly poolSeleccionado = computed(() => {
    const s = this._seleccion();
    return s?.tipo === 'pool' && s.id !== null ? (this.pools().find((p) => p.id === s.id) ?? null) : null;
  });

  /** Lane abierta en el panel; se busca en las lanes de todos los pools (flatMap aplana el arreglo de arreglos). */
  readonly laneSeleccionada = computed(() => {
    const s = this._seleccion();
    if (s?.tipo !== 'lane' || s.id === null) {
      return null;
    }
    return this.pools().flatMap((p) => p.lanes).find((l) => l.id === s.id) ?? null;
  });

  /** Pool en el que se crea o edita la lane abierta. */
  readonly poolDeLane = computed(() => {
    const s = this._seleccion();
    return s?.tipo === 'lane' ? (this.pools().find((p) => p.id === s.poolId) ?? null) : null;
  });

  /** Elemento del flujo abierto en el panel (actividad, gateway o evento). */
  readonly nodoSeleccionado = computed(() => {
    const s = this._seleccion();
    return s?.tipo === 'nodo' ? (this.nodos().find((n) => n.id === s.id) ?? null) : null;
  });

  /** Mensaje abierto en el panel (null si la selección no es un mensaje). */
  readonly mensajeSeleccionado = computed(() => {
    const s = this._seleccion();
    return s?.tipo === 'mensaje' ? (this.mensajes().find((m) => m.id === s.id) ?? null) : null;
  });

  /** Arco (flujo de secuencia) abierto en el panel; null si no hay o es uno nuevo. */
  readonly arcoSeleccionado = computed(() => {
    const s = this._seleccion();
    return s?.tipo === 'arco' && s.id !== null ? (this.arcos().find((a) => a.id === s.id) ?? null) : null;
  });

  /** Id del elemento resaltado en el lienzo, cualquiera sea su tipo. */
  readonly idResaltado = computed(() => {
    const s = this._seleccion();
    if (s?.tipo === 'nodo') {
      return s.id;
    }
    if (s?.tipo === 'mensaje') {
      return this.mensajeSeleccionado()?.nodo.id ?? null;
    }
    return null;
  });

  /** Mensaje al que pertenece un elemento del flujo (un throw, un catch o una tarea de envío). */
  mensajeDeNodo(nodoId: number) {
    return this.mensajes().find((m) => m.nodo.id === nodoId) ?? null;
  }

  /** Lanes de un pool ordenadas por su campo orden (copia el arreglo para no alterar el original). */
  lanesDePool(poolId: number) {
    return [...(this.pools().find((p) => p.id === poolId)?.lanes ?? [])].sort((a, b) => a.orden - b.orden);
  }

  /** Diagrama y catálogo de roles a la vez (forkJoin): se muestran juntos. */
  cargar(procesoId: number): Observable<void> {
    // Al cargar otro proceso se limpia todo el estado anterior.
    this._problemaCarga.set(null);
    this._seleccion.set(null);
    this._herramienta.set('seleccionar');
    this._origenConexion.set(null);
    return forkJoin({
      diagrama: this.diagramaService.obtener(procesoId),
      // forkJoin lanza las dos peticiones a la vez y emite cuando ambas terminan.
      // Sin el catálogo igual se puede ver el diagrama: su error no debe tumbar la carga
      roles: this.rolProcesoService.listar('', { page: 0, size: 200, sort: 'nombre,asc' }).pipe(
        // Solo se guardan id y nombre de cada rol, que es lo que necesita el selector.
        map((pagina) => pagina.content.map((r) => ({ id: r.id, nombre: r.nombre }))),
        // Si falla el catálogo, se usa una lista vacía en vez de propagar el error.
        catchError(() => of([] as RolProcesoResumen[])),
      ),
    }).pipe(
      // tap: guarda los resultados en los signals sin alterar lo que fluye por el pipe.
      tap(({ diagrama, roles }) => {
        this._diagrama.set(diagrama);
        this._roles.set(roles);
      }),
      // El Observable solo avisa que terminó; los datos ya quedaron en los signals.
      map(() => undefined),
      // Error en la carga: se deja el diagrama vacío, se guarda el problema para mostrarlo y se devuelve un Observable normal para que no se rompa el flujo.
      catchError((err) => {
        this._diagrama.set(null);
        this._problemaCarga.set(problemaDe(err));
        return of(undefined);
      }),
    );
  }

  /** Después de cada cambio se vuelve a pedir el diagrama: así las advertencias quedan al día. */
  recargar(): Observable<Diagrama> {
    const id = this.proceso()?.id;
    // Sin proceso cargado no hay nada que recargar: of() es un Observable que termina sin emitir.
    if (!id) {
      return of();
    }
    // Vuelve a pedir el diagrama a la API y reemplaza el signal con el resultado nuevo.
    return this.diagramaService.obtener(id).pipe(tap((diagrama) => this._diagrama.set(diagrama)));
  }

  /** Abre (o cierra con null) un elemento en el panel lateral. */
  seleccionar(seleccion: Seleccion | null): void {
    this._seleccion.set(seleccion);
  }

  /** Cambia la herramienta activa y descarta cualquier conexión a medias. */
  usarHerramienta(herramienta: Herramienta): void {
    this._herramienta.set(herramienta);
    this._origenConexion.set(null);
  }

  /** Guarda el primer nodo elegido al conectar (o null para cancelar). */
  marcarOrigenConexion(nodoId: number | null): void {
    this._origenConexion.set(nodoId);
  }

  /** Resultado de "Validar": reemplaza las advertencias sin volver a pedir el diagrama. */
  establecerAdvertencias(advertencias: Advertencia[]): void {
    // Copia el diagrama con las advertencias nuevas (spread `...diagrama`): los signals se actualizan con objetos nuevos, no mutando.
    const diagrama = this._diagrama();
    if (diagrama) {
      this._diagrama.set({ ...diagrama, advertencias });
    }
  }
}
