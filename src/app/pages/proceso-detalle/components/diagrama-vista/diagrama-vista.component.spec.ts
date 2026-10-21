import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Diagrama } from '../../../../models/diagrama.model';
import { Proceso } from '../../../../models/proceso.model';
import { DiagramaVistaComponent } from './diagrama-vista.component';

describe('DiagramaVistaComponent (HU-07)', () => {
  let fixture: ComponentFixture<DiagramaVistaComponent>;
  let backend: HttpTestingController;
  let html: HTMLElement;

  const proceso: Proceso = {
    id: 5, nombre: 'Vacaciones', descripcion: null, categoria: 'Talento humano', estado: 'PUBLICADO', activo: true,
    version: 1, propio: true, creadoEn: '', creadoPor: '', modificadoEn: '', modificadoPor: '',
  };
  const base = { poolId: 1, laneId: 10, tipoActividad: null, tipoGateway: null, variante: null, posY: 0 };
  const diagrama: Diagrama = {
    proceso,
    pools: [
      { id: 1, procesoId: 5, nombre: 'Facimus', tipo: 'PROPIETARIO', cajaNegra: false, orden: 0, permisoEstructura: 'ADMINISTRADOR_Y_EDITOR',
        lanes: [{ id: 10, poolId: 1, rolProcesoId: 1, nombre: 'Empleado', orden: 0 },
                { id: 11, poolId: 1, rolProcesoId: 2, nombre: 'Jefe', orden: 1 }] },
    ],
    nodos: [
      { ...base, id: 1, tipo: 'EVENTO_INICIO', nombre: 'Inicio', posX: 40 },
      { ...base, id: 2, tipo: 'ACTIVIDAD', nombre: 'Radicar solicitud', tipoActividad: 'USUARIO', posX: 160 },
      { ...base, id: 3, tipo: 'EVENTO_FIN', nombre: 'Fin', posX: 320 },
    ],
    arcos: [
      { id: 100, origenId: 1, destinoId: 2, etiqueta: null, condicion: null },
      { id: 101, origenId: 2, destinoId: 3, etiqueta: null, condicion: null },
    ],
    mensajes: [],
    advertencias: [{ codigo: 'SIN_SALIDA', severidad: 'ERROR', mensaje: '', elementoId: 3 }],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [DiagramaVistaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DiagramaVistaComponent);
    fixture.componentRef.setInput('procesoId', 5);
    html = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => backend.verify());

  it('al abrir el proceso dibuja el diagrama completo en solo lectura con su resumen', () => {
    expect(html.textContent).toContain('Cargando el diagrama');
    backend.expectOne('/api/v1/procesos/5/diagrama').flush(diagrama);
    fixture.detectChanges();

    expect(html.querySelector('svg.lienzo-bpmn')).not.toBeNull();
    expect(html.querySelector('svg.lienzo-bpmn')!.classList).not.toContain('colocando');
    expect(html.textContent).toContain('Radicar solicitud');
    expect(html.textContent).toContain('Empleado');
    const resumen = html.querySelector('#diagramaResumen')!.textContent!.replace(/\s+/g, ' ');
    expect(resumen).toContain('1 pool · 2 lanes · 3 elementos · 2 arcos · 0 mensajes');
    expect(resumen).toContain('1 error de coherencia');
  });

  it('avisa cuando el diagrama todavía no tiene elementos', () => {
    backend.expectOne('/api/v1/procesos/5/diagrama').flush({ ...diagrama, pools: [], nodos: [], arcos: [], advertencias: [] });
    fixture.detectChanges();
    expect(html.querySelector('#diagramaVacio')).not.toBeNull();
  });

  it('muestra el motivo si la API no entrega el diagrama', () => {
    backend.expectOne('/api/v1/procesos/5/diagrama').flush(
      { title: 'Recurso no encontrado', status: 404, detail: 'No existe el proceso 5' }, { status: 404, statusText: 'Not Found' });
    fixture.detectChanges();
    expect(html.querySelector('#diagramaVistaError')!.textContent).toContain('No existe el proceso 5');
  });
});
