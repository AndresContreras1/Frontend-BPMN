import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { SesionStore } from '../../../core/services/sesion.store';
import { Diagrama } from '../../../models/diagrama.model';
import { RolAcceso } from '../../../models/usuario.model';
import { Posicion } from '../layout';
import { ProcesoEditorPageComponent } from './proceso-editor-page.component';

describe('ProcesoEditorPageComponent: lienzo (HU-08 a HU-16, HU-25 a HU-28)', () => {
  let fixture: ComponentFixture<ProcesoEditorPageComponent>;
  let pagina: ProcesoEditorPageComponent;
  let backend: HttpTestingController;
  let html: HTMLElement;

  const base = { poolId: 1, tipoActividad: null, tipoGateway: null, variante: null, posY: 0 };
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

  const recargar = () => {
    backend.expectOne('/api/v1/procesos/9/diagrama').flush(diagrama());
    fixture.detectChanges();
  };

  const pool = (id: number) => pagina.store.pools().find((p) => p.id === id)!;
  const enLane = (posX: number, posY = 0): Posicion => ({ pool: pool(1), lane: pool(1).lanes[0], posX, posY });
  const clicNodo = (id: number) => {
    html.querySelector(`g.nodo[data-nodo="${id}"]`)!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
  };

  afterEach(() => backend.verify());

  it('con la herramienta Actividad, un clic en la lane abre el formulario con esa posición y lo guarda', () => {
    crear('EDITOR');
    html.querySelector<HTMLButtonElement>('#herramienta-ACTIVIDAD')!.click();
    pagina.alClicLienzo(enLane(520, 20));
    fixture.detectChanges();

    expect(html.querySelector('#panelElemento')!.textContent).toContain('Nueva actividad');
    const nombre = html.querySelector<HTMLInputElement>('#actividadNombre')!;
    nombre.value = 'Aprobar';
    nombre.dispatchEvent(new Event('input'));
    html.querySelector<HTMLButtonElement>('#guardarActividadBtn')!.click();

    const req = backend.expectOne({ method: 'POST', url: '/api/v1/lanes/10/actividades' });
    expect(req.request.body).toEqual({ nombre: 'Aprobar', tipoActividad: 'USUARIO', laneId: 10, posX: 520, posY: 20 });
    req.flush({});
    recargar();
    expect(html.querySelector('#avisoEditor')!.textContent).toContain('Actividad "Aprobar" agregada.');
    expect(html.querySelector('#panelElemento')).toBeNull();
  });

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

  it('Conectar: el primer clic marca el origen y el segundo abre el arco nuevo', () => {
    crear('EDITOR');
    html.querySelector<HTMLButtonElement>('#herramienta-conectar')!.click();
    fixture.detectChanges();
    clicNodo(2);
    expect(html.querySelector('g.nodo.origen-conexion')).not.toBeNull();
    expect(html.querySelector('#ayudaHerramienta')!.textContent).toContain('destino');
    clicNodo(3);

    expect(html.querySelector('#panelElemento')!.textContent).toContain('Nuevo flujo de secuencia');
    html.querySelector<HTMLButtonElement>('#guardarArcoBtn')!.click();
    const req = backend.expectOne({ method: 'POST', url: '/api/v1/arcos' });
    expect(req.request.body).toEqual({ procesoId: 9, origenId: 2, destinoId: 3, etiqueta: null, condicion: null });
    req.flush({});
    recargar();
  });

  it('un clic en un elemento de mensaje abre el mensaje y su correlación', () => {
    crear('EDITOR');
    clicNodo(3);
    expect(html.querySelector('#panelElemento')!.textContent).toContain('Notificación externa');
    expect(html.querySelector('#correlacionForm')).not.toBeNull();
  });

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

  it('un cambio incoherente en un proceso publicado muestra los motivos de la API', () => {
    crear('EDITOR');
    clicNodo(2);
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
});
