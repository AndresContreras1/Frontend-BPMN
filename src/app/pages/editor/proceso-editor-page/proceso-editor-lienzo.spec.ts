import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { SesionStore } from '../../../core/services/sesion.store';
import { Diagrama } from '../../../models/diagrama.model';
import { RolAcceso } from '../../../models/usuario.model';
import { Posicion } from '../../../components/diagrama/layout';
import { ProcesoEditorPageComponent } from './proceso-editor-page.component';

/**
 * Pruebas del editor en la pestaña del lienzo: herramientas para colocar elementos, conectar, mover,
 * eliminar y validar el diagrama (HU-08 a HU-16, HU-25 a HU-28).
 */
describe('ProcesoEditorPageComponent: lienzo (HU-08 a HU-16, HU-25 a HU-28)', () => {
  let fixture: ComponentFixture<ProcesoEditorPageComponent>;
  let pagina: ProcesoEditorPageComponent;
  let backend: HttpTestingController;
  let html: HTMLElement;

  // Datos comunes de los nodos de ejemplo
  const base = { poolId: 1, tipoActividad: null, tipoGateway: null, variante: null, posY: 0 };
  // Ayuda: diagrama de ejemplo con 2 pools, 3 nodos (inicio, actividad y mensaje), un arco, un mensaje y una advertencia
  const diagrama = (): Diagrama => ({
    proceso: {
      id: 9, nombre: 'Compras', descripcion: null, categoria: 'Compras', estado: 'BORRADOR', activo: true, version: 0,
      propio: true, creadoEn: '', creadoPor: '', modificadoEn: '', modificadoPor: '',
    },
    pools: [
      { id: 1, procesoId: 9, nombre: 'Facimus', tipo: 'PROPIETARIO', cajaNegra: false, orden: 0, permisoEstructura: 'ADMINISTRADOR_Y_EDITOR',
        lanes: [{ id: 10, poolId: 1, rolProcesoId: 1, nombre: 'Analista', orden: 0 }] },
      { id: 2, procesoId: 9, nombre: 'Correo', tipo: 'SISTEMA_EXTERNO', cajaNegra: true, orden: 1, permisoEstructura: 'ADMINISTRADOR_Y_EDITOR', lanes: [] },
    ],
    nodos: [
      { ...base, id: 1, laneId: 10, tipo: 'EVENTO_INICIO', nombre: null, posX: 40 },
      { ...base, id: 2, laneId: 10, tipo: 'ACTIVIDAD', nombre: 'Registrar', tipoActividad: 'USUARIO', posX: 200 },
      { ...base, id: 3, laneId: 10, tipo: 'MESSAGE_THROW', nombre: 'Aviso', variante: 'INTERMEDIO', posX: 360 },
    ],
    arcos: [{ id: 100, origenId: 1, destinoId: 2, etiqueta: null, condicion: null }],
    mensajes: [{
      id: 50, nodo: { ...base, id: 3, laneId: 10, tipo: 'MESSAGE_THROW', nombre: 'Aviso', variante: 'INTERMEDIO', posX: 360 },
      direccion: 'ENVIO', nombre: 'Aviso', poolOrigenId: 1, poolDestinoId: 2, nodoDestinoId: null, tipoDestino: 'CORREO', momento: null,
      politicaFallo: 'CONTINUAR', actividadManejoErrorId: null, origenExterno: false, claveCorrelacion: null, accionSinCaso: null,
      campos: [], actividadesQueUsanIds: [],
    }],
    advertencias: [{ codigo: 'SIN_SALIDA', severidad: 'ERROR', mensaje: "'Registrar' no tiene camino de salida", elementoId: 2 }],
  });

  // Ayuda: arma el editor para un rol: inicia sesión, usa un ActivatedRoute falso con id=9 y responde
  // las dos peticiones iniciales (catálogo de roles y diagrama).
  const crear = (rol: RolAcceso) => {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [ProcesoEditorPageComponent],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '9' })) } },
      ],
    });
    TestBed.inject(SesionStore).iniciar({
      token: 't', tipo: 'Bearer', expiraEnSegundos: 1800,
      usuario: { id: 1, nombre: 'Ana', correo: 'a@a.com', rol, empresaId: 1, empresaNombre: 'Demo' },
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ProcesoEditorPageComponent);
    pagina = fixture.componentInstance;
    html = fixture.nativeElement;
    fixture.detectChanges();
    backend.expectOne((r) => r.url === '/api/v1/roles-proceso').flush({ content: [], page: 0, size: 200, totalElements: 0, totalPages: 0 });
    backend.expectOne('/api/v1/procesos/9/diagrama').flush(diagrama());
    fixture.detectChanges();
  };

  // Ayuda: responde la nueva carga del diagrama que el editor hace después de cada cambio
  const recargar = () => {
    backend.expectOne('/api/v1/procesos/9/diagrama').flush(diagrama());
    fixture.detectChanges();
  };

  // Ayudas: buscar un pool en el store, simular una posición de clic dentro de la lane 10
  // y simular un clic sobre un nodo del lienzo
  const pool = (id: number) => pagina.store.pools().find((p) => p.id === id)!;
  const enLane = (posX: number, posY = 0): Posicion => ({ pool: pool(1), lane: pool(1).lanes[0], posX, posY });
  const clicNodo = (id: number) => {
    html.querySelector(`g.nodo[data-nodo="${id}"]`)!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
  };

  // verify falla si quedó alguna petición HTTP sin responder
  afterEach(() => backend.verify());

  // Escenario: se elige la herramienta Actividad y se hace clic en la lane (se llama alClicLienzo directamente).
  // Esperado: se abre el formulario con la posición del clic, se guarda con un POST, se recarga el diagrama y
  // se muestra el aviso.
  it('con la herramienta Actividad, un clic en la lane abre el formulario con esa posición y lo guarda', () => {
    crear('EDITOR');
    html.querySelector<HTMLButtonElement>('#herramienta-ACTIVIDAD')!.click();
    pagina.alClicLienzo(enLane(520, 20));
    fixture.detectChanges();

    expect(html.querySelector('#panelElemento')!.textContent).toContain('Nueva actividad');
    const nombre = html.querySelector<HTMLInputElement>('#actividadNombre')!;
    nombre.value = 'Aprobar';
    nombre.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#guardarActividadBtn')!.click();

    const req = backend.expectOne({ method: 'POST', url: '/api/v1/lanes/10/actividades' });
    expect(req.request.body).toEqual({ nombre: 'Aprobar', tipoActividad: 'USUARIO', laneId: 10, posX: 520, posY: 20 });
    req.flush({});
    recargar();
    expect(html.querySelector('#avisoEditor')!.textContent).toContain('Actividad "Aprobar" agregada.');
    expect(html.querySelector('#panelElemento')).toBeNull();
  });

  // Esperado: un clic en un pool de caja negra, o una actividad fuera de una lane, muestra un aviso y no abre el formulario.
  it('no coloca elementos en un pool de caja negra ni actividades fuera de una lane', () => {
    crear('EDITOR');
    pagina.cambiarHerramienta('INICIO');
    pagina.alClicLienzo({ pool: pool(2), lane: null, posX: 100, posY: 0 });
    fixture.detectChanges();
    expect(html.textContent).toContain('es caja negra');

    pagina.cambiarHerramienta('GATEWAY');
    pagina.alClicLienzo({ pool: pool(1), lane: null, posX: 100, posY: 0 });
    fixture.detectChanges();
    expect(html.textContent).toContain('van dentro de una lane');
    expect(html.querySelector('#panelElemento')).toBeNull();
  });

  // Escenario: con la herramienta Conectar se hace clic en el nodo 2 y luego en el 3.
  // Esperado: el primero queda marcado como origen; el segundo abre el formulario del arco y al guardar
  // se envía un POST con origen y destino.
  it('Conectar: el primer clic marca el origen y el segundo abre el arco nuevo', () => {
    crear('EDITOR');
    html.querySelector<HTMLButtonElement>('#herramienta-conectar')!.click();
    fixture.detectChanges();
    clicNodo(2);
    expect(html.querySelector('g.nodo.origen-conexion')).not.toBeNull();
    expect(html.querySelector('#ayudaHerramienta')!.textContent).toContain('destino');
    clicNodo(3);

    expect(html.querySelector('#panelElemento')!.textContent).toContain('Nuevo flujo de secuencia');
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#guardarArcoBtn')!.click();
    const req = backend.expectOne({ method: 'POST', url: '/api/v1/arcos' });
    expect(req.request.body).toEqual({ procesoId: 9, origenId: 2, destinoId: 3, etiqueta: null, condicion: null });
    req.flush({});
    recargar();
  });

  // Esperado: al seleccionar un nodo de mensaje se abre su panel con el formulario de correlación.
  it('un clic en un elemento de mensaje abre el mensaje y su correlación', () => {
    crear('EDITOR');
    clicNodo(3);
    expect(html.querySelector('#panelElemento')!.textContent).toContain('Notificación externa');
    expect(html.querySelector('#correlacionForm')).not.toBeNull();
  });

  // Esperado: mover a otro pool se rechaza con un aviso; mover dentro de su pool envía un PUT con la posición nueva.
  it('Mover: cambia la posición de una actividad, pero no la saca de su pool', () => {
    crear('EDITOR');
    clicNodo(2);
    pagina.cambiarHerramienta('mover');
    pagina.alClicLienzo({ pool: pool(2), lane: null, posX: 50, posY: 0 });
    fixture.detectChanges();
    expect(html.textContent).toContain('solo se mueve dentro de su pool');

    pagina.alClicLienzo(enLane(260, 40));
    const req = backend.expectOne({ method: 'PUT', url: '/api/v1/actividades/2' });
    expect(req.request.body).toEqual({ nombre: 'Registrar', tipoActividad: 'USUARIO', laneId: 10, posX: 260, posY: 40 });
    req.flush({});
    recargar();
  });

  // Esperado: antes de eliminar se consulta el impacto (qué arcos y advertencias genera), el modal lo muestra
  // y al confirmar se envía el DELETE, se recarga y se avisa.
  it('eliminar pide el impacto, lo muestra y elimina al confirmar (administrador)', () => {
    crear('ADMINISTRADOR');
    clicNodo(2);
    html.querySelector<HTMLButtonElement>('#eliminarElementoBtn')!.click();
    backend.expectOne('/api/v1/actividades/2/impacto').flush({
      arcosQueSeEliminan: [100],
      advertencias: [{ codigo: 'SIN_SALIDA', severidad: 'ERROR', mensaje: 'El inicio no tiene camino de salida', elementoId: 1 }],
    });
    fixture.detectChanges();
    const modal = html.querySelector('.modal')!.textContent!;
    expect(modal).toContain('También se eliminan 1 arco conectado');
    expect(modal).toContain('El inicio no tiene camino de salida');

    html.querySelector<HTMLButtonElement>('#confirmarEliminarBtn')!.click();
    backend.expectOne({ method: 'DELETE', url: '/api/v1/actividades/2' }).flush(null, { status: 204, statusText: 'No Content' });
    recargar();
    expect(html.querySelector('#avisoEditor')!.textContent).toContain('Elemento eliminado.');
  });

  // Esperado: al eliminar un arco el modal no dice "También se eliminan..." porque el arco es el propio elemento.
  it('al eliminar un arco no lo cuenta como "también"', () => {
    crear('ADMINISTRADOR');
    html.querySelector('g.arco[data-arco="100"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#eliminarElementoBtn')!.click();
    backend.expectOne('/api/v1/arcos/100/impacto').flush({ arcosQueSeEliminan: [100], advertencias: [] });
    fixture.detectChanges();
    expect(html.querySelector('.modal')!.textContent).not.toContain('También');
    html.querySelector<HTMLButtonElement>('.modal .btn-secondary')!.click();
  });

  // Esperado: el editor no tiene botón de eliminar; el lector no ve herramientas ni guardar y sus campos están
  // deshabilitados. resetTestingModule reinicia el módulo para poder crear el editor otra vez con otro rol.
  it('el editor no ve eliminar; el lector no ve herramientas ni guardar', () => {
    crear('EDITOR');
    clicNodo(2);
    expect(html.querySelector('#eliminarElementoBtn')).toBeNull();
    TestBed.resetTestingModule();

    crear('LECTOR');
    expect(html.querySelector('#herramientasEditor')).toBeNull();
    clicNodo(2);
    expect(html.querySelector('#guardarActividadBtn')).toBeNull();
    expect(html.querySelector<HTMLInputElement>('#actividadNombre')!.disabled).toBeTrue();
  });

  // Esperado: el botón Validar consulta la validación, muestra el conteo y la advertencia; desde la advertencia
  // se abre y se selecciona el elemento afectado.
  it('Validar muestra el resultado y desde una advertencia se abre el elemento', () => {
    crear('EDITOR');
    html.querySelector<HTMLButtonElement>('#validarDiagramaBtn')!.click();
    backend.expectOne('/api/v1/procesos/9/validacion').flush(diagrama().advertencias);
    fixture.detectChanges();
    expect(html.querySelector('#avisoEditor')!.textContent).toContain('1 error');
    expect(html.querySelector('#advertenciasPanel')!.textContent).toContain('no tiene camino de salida');

    html.querySelector<HTMLButtonElement>('#advertenciasPanel button[title="Ver en el diagrama"]')!.click();
    fixture.detectChanges();
    expect(html.querySelector('#panelElemento')!.textContent).toContain('Actividad');
    expect(html.querySelector('g.nodo[data-nodo="2"]')!.classList).toContain('seleccionado');
  });

  // Escenario: el servidor responde 409 al guardar un cambio que dejaría el diagrama incoherente.
  // Esperado: se muestran los motivos y el panel sigue abierto.
  it('un cambio incoherente en un proceso publicado muestra los motivos de la API', () => {
    crear('EDITOR');
    clicNodo(2);
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#guardarActividadBtn')!.click();
    backend.expectOne({ method: 'PUT', url: '/api/v1/actividades/2' }).flush(
      { title: 'Regla de negocio', status: 409, detail: 'El proceso está publicado y el cambio dejaría el diagrama incoherente.',
        detalles: ["'Registrar' no tiene camino de salida"] },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();
    expect(html.textContent).toContain('dejaría el diagrama incoherente');
    expect(html.querySelector('#panelElemento')).not.toBeNull();
  });

  // Esperado: guardarCondiciones envía un PUT por arco con la condición, recarga el diagrama y avisa.
  it('HU-15: guardar las condiciones del gateway actualiza cada arco y recarga el diagrama', () => {
    crear('EDITOR');
    const arco = pagina.store.arcos()[0];

    pagina.guardarCondiciones([{ arco, condicion: 'monto > 100' }]);

    const req = backend.expectOne({ method: 'PUT', url: '/api/v1/arcos/100' });
    expect(req.request.body).toEqual({ procesoId: 9, origenId: 1, destinoId: 2, etiqueta: null, condicion: 'monto > 100' });
    req.flush({ ...arco, condicion: 'monto > 100' });
    recargar();
    expect(html.textContent).toContain('Condición actualizada.');
  });
});
