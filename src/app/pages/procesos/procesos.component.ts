import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, debounceTime, finalize, of, switchMap } from 'rxjs';

import { AlertaErrorComponent } from '../../components/alerta-error/alerta-error.component';
import { ConfirmarModalComponent } from '../../components/confirmar-modal/confirmar-modal.component';
import { EstadoBadgeComponent } from '../../components/estado-badge/estado-badge.component';
import { PageTitleComponent } from '../../components/page-title/page-title.component';
import { PaginadorComponent } from '../../components/paginador/paginador.component';
import { Columna, TablaGenericaComponent } from '../../components/tabla-generica/tabla-generica.component';
import { problemaDe } from '../../core/services/errores';
import { PreferenciasService } from '../../core/services/preferencias.service';
import { SesionStore } from '../../core/services/sesion.store';
import { ProblemDetail } from '../../models/problem-detail.model';
import { EstadoProceso, Proceso } from '../../models/proceso.model';
import { ProcesoService } from '../../service/proceso.service';
import { ProcesoTarjetaComponent } from './components/proceso-tarjeta/proceso-tarjeta.component';

/** Las dos formas de ver la lista; "as const" hace que sean valores exactos y no un string cualquiera. */
const VISTAS = ['tabla', 'tarjetas'] as const;
/** Tipo derivado de VISTAS: solo permite 'tabla' o 'tarjetas'. */
export type VistaProcesos = (typeof VISTAS)[number];

/**
 * HU-07: procesos de la empresa con búsqueda por nombre, filtros por estado y categoría, orden y
 * paginación. "Ver eliminados" lista los inactivos (HU-06), que se conservan para consulta.
 * La lista se ve como tabla o como tarjetas; la elección se recuerda en el navegador.
 */
@Component({
  selector: 'app-procesos',
  imports: [
    DatePipe, RouterLink, PageTitleComponent, PaginadorComponent, AlertaErrorComponent, ConfirmarModalComponent,
    EstadoBadgeComponent, TablaGenericaComponent, ProcesoTarjetaComponent,
  ],
  templateUrl: './procesos.component.html',
  styleUrl: './procesos.component.scss',
})
export class ProcesosComponent implements OnInit {
  /** Servicio que habla con la API de procesos. */
  private readonly procesoService = inject(ProcesoService);
  /** Guarda y lee preferencias del usuario en el navegador (aqui, la vista elegida). */
  private readonly preferencias = inject(PreferenciasService);
  /** Datos de la sesion (rol); publico porque el HTML lo usa para mostrar o no botones. */
  readonly sesion = inject(SesionStore);

  /** Da acceso a los parametros de la URL (query params). */
  private readonly route = inject(ActivatedRoute);

  /** ?eliminado=<nombre>: aviso al volver de eliminar un proceso (HU-06). */
  eliminado = signal<string | null>(null);

  /** Texto de la busqueda por nombre. */
  texto = signal('');
  /** Filtro de estado; '' significa todos. */
  estado = signal<EstadoProceso | ''>('');
  /** Filtro de categoria; '' significa todas. */
  categoria = signal('');
  /** Si es true se listan los procesos eliminados (inactivos) en vez de los activos. */
  verEliminados = signal(false);
  /** Pagina actual (empieza en 0). */
  page = signal(0);
  /** Orden en formato "campo,direccion" que entiende la API. */
  orden = signal('nombre,asc');
  /** Contador que se incrementa para forzar una nueva consulta (por ejemplo tras eliminar). */
  private readonly recargar = signal(0);

  /** True mientras llega la lista. */
  cargando = signal(true);
  /** Error de la API para mostrar en la alerta. */
  problema = signal<ProblemDetail | null>(null);
  /** Mensaje de exito tras eliminar un proceso desde esta pagina. */
  aviso = signal('');
  /** Proceso pendiente de confirmar eliminacion; mientras no es null el modal esta abierto. */
  porEliminar = signal<Proceso | null>(null);
  /** Vista actual (tabla o tarjetas); arranca con lo que el usuario eligio la ultima vez. */
  vista = signal<VistaProcesos>(this.preferencias.leer('vistaProcesos', VISTAS, 'tabla'));

  /**
   * Categorias para el filtro. toSignal convierte el observable en signal;
   * si la peticion falla se usa una lista vacia para no romper la pagina.
   */
  categorias = toSignal(this.procesoService.categorias().pipe(catchError(() => of([] as string[]))), {
    initialValue: [] as string[],
  });

  /** Columnas de la tabla; 'ordenable' permite ordenar al hacer clic en el encabezado. */
  columnas: Columna[] = [
    { clave: 'nombre', titulo: 'Nombre', ordenable: true },
    { clave: 'categoria', titulo: 'Categoría', ordenable: true },
    { clave: 'estado', titulo: 'Estado', ordenable: true },
    { clave: 'modificadoEn', titulo: 'Última modificación', ordenable: true },
    { clave: '', titulo: 'Acciones', clase: 'text-end' },
  ];

  /**
   * Junta todo lo que define la consulta (filtros, paginacion y contador de recarga).
   * Como es un computed, cambia sola cuando cambia cualquiera de esas signals.
   */
  private readonly consulta = computed(() => ({
    // activo es lo contrario de "ver eliminados"
    filtro: { nombre: this.texto(), estado: this.estado(), categoria: this.categoria(), activo: !this.verEliminados() },
    paginacion: { page: this.page(), size: 10, sort: this.orden() },
    recarga: this.recargar(),
  }));

  /** Pagina de resultados como signal (null hasta que llega la primera respuesta). */
  resultado = toSignal(
    toObservable(this.consulta).pipe(
      // debounceTime: espera 300 ms sin cambios antes de consultar, asi no se llama a la API con cada letra que se escribe
      debounceTime(300),
      // switchMap: si llega una consulta nueva, cancela la anterior que siga en vuelo
      switchMap((c) => {
        this.cargando.set(true);
        return this.procesoService.listar(c.filtro, c.paginacion).pipe(
          // Si falla se guarda el error y se emite null
          catchError((err) => {
            this.problema.set(problemaDe(err));
            return of(null);
          }),
          // Apaga el spinner al terminar, con exito o con error
          finalize(() => this.cargando.set(false)),
        );
      }),
    ),
    { initialValue: null },
  );

  /** True si hay algun filtro activo; sirve para mostrar el boton "Limpiar filtros". */
  hayFiltros = computed(() => this.texto() !== '' || this.estado() !== '' || this.categoria() !== '');

  /**
   * Parámetros de la URL: ?eliminado=<nombre> (aviso al volver de eliminar), ?estado=BORRADOR|PUBLICADO y
   * ?eliminados=true (los enlaces de los indicadores del inicio).
   */
  ngOnInit(): void {
    const parametros = this.route.snapshot.queryParamMap;
    this.eliminado.set(parametros.get('eliminado'));
    const estado = parametros.get('estado');
    // Solo se acepta un estado valido; cualquier otro valor de la URL se ignora
    if (estado === 'BORRADOR' || estado === 'PUBLICADO') {
      this.estado.set(estado);
    }
    this.verEliminados.set(parametros.get('eliminados') === 'true');
  }

  /** Cambia entre tabla y tarjetas y recuerda la eleccion en el navegador. */
  cambiarVista(vista: VistaProcesos): void {
    this.vista.set(vista);
    this.preferencias.guardar('vistaProcesos', vista);
  }

  // Cualquier cambio de filtro u orden vuelve a la primera página

  /** Aplica la busqueda por nombre. */
  buscar(texto: string): void {
    this.texto.set(texto);
    this.page.set(0);
  }

  /** Aplica el filtro de estado. */
  filtrarEstado(estado: EstadoProceso | ''): void {
    this.estado.set(estado);
    this.page.set(0);
  }

  /** Aplica el filtro de categoria. */
  filtrarCategoria(categoria: string): void {
    this.categoria.set(categoria);
    this.page.set(0);
  }

  /** Alterna entre procesos activos y eliminados. */
  mostrarEliminados(ver: boolean): void {
    this.verEliminados.set(ver);
    this.page.set(0);
  }

  /** Cambia el orden (lo emite la tabla al pulsar un encabezado). */
  ordenar(orden: string): void {
    this.orden.set(orden);
    this.page.set(0);
  }

  /** Quita busqueda, estado y categoria. */
  limpiarFiltros(): void {
    this.texto.set('');
    this.estado.set('');
    this.categoria.set('');
    this.page.set(0);
  }

  /** Se ejecuta al confirmar en el modal: elimina el proceso y recarga la lista. */
  confirmarEliminar(): void {
    const proceso = this.porEliminar();
    // Se cierra el modal en cualquier caso
    this.porEliminar.set(null);
    if (!proceso) {
      return;
    }
    this.problema.set(null);
    this.procesoService.eliminar(proceso.id).subscribe({
      next: () => {
        this.aviso.set(`"${proceso.nombre}" quedó eliminado. Puede consultarlo en "Ver eliminados".`);
        // Subir el contador cambia "consulta" y eso vuelve a pedir la lista
        this.recargar.update((n) => n + 1);
      },
      error: (err) => this.problema.set(problemaDe(err)),
    });
  }
}
