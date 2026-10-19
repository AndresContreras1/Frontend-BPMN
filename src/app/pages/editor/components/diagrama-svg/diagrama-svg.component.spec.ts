import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Mensaje } from '../../../../models/mensaje.model';
import { Nodo } from '../../../../models/nodo.model';
import { Pool } from '../../../../models/pool.model';
import { Posicion } from '../../layout';
import { DiagramaSvgComponent } from './diagrama-svg.component';

describe('DiagramaSvgComponent (lienzo)', () => {
  let fixture: ComponentFixture<DiagramaSvgComponent>;
  let html: HTMLElement;

  const pools: Pool[] = [
    { id: 1, procesoId: 9, nombre: 'Facimus', tipo: 'PROPIETARIO', cajaNegra: false, orden: 0, permisoEstructura: 'ADMINISTRADOR_Y_EDITOR',
      lanes: [{ id: 10, poolId: 1, rolProcesoId: 1, nombre: 'Empleado', orden: 0 }] },
    { id: 2, procesoId: 9, nombre: 'Correo', tipo: 'SISTEMA_EXTERNO', cajaNegra: true, orden: 1, permisoEstructura: 'ADMINISTRADOR_Y_EDITOR', lanes: [] },
  ];
  const base = { poolId: 1, laneId: 10, tipoActividad: null, tipoGateway: null, variante: null, posY: 0 };
  const nodos: Nodo[] = [
    { ...base, id: 1, tipo: 'EVENTO_INICIO', nombre: 'Inicio', posX: 40 },
    { ...base, id: 2, tipo: 'ACTIVIDAD', nombre: 'Radicar solicitud', tipoActividad: 'USUARIO', posX: 160 },
    { ...base, id: 3, tipo: 'GATEWAY', nombre: '¿Aprobada?', tipoGateway: 'EXCLUSIVO', posX: 320 },
    { ...base, id: 4, tipo: 'MESSAGE_THROW', nombre: 'Notificar', variante: 'INTERMEDIO', posX: 480 },
    { ...base, id: 5, tipo: 'EVENTO_FIN', nombre: 'Fin', posX: 640 },
  ];
  const mensaje: Mensaje = {
    id: 50, nodo: nodos[3], direccion: 'ENVIO', nombre: 'Notificar', poolOrigenId: 1, poolDestinoId: 2, nodoDestinoId: null,
    tipoDestino: 'CORREO', momento: null, politicaFallo: 'CONTINUAR', actividadManejoErrorId: null, origenExterno: false,
    claveCorrelacion: 'numeroSolicitud', accionSinCaso: 'DESCARTAR', campos: [], actividadesQueUsanIds: [],
  };

  beforeEach(() => {
    fixture = TestBed.createComponent(DiagramaSvgComponent);
    fixture.componentRef.setInput('pools', pools);
    fixture.componentRef.setInput('nodos', nodos);
    fixture.componentRef.setInput('arcos', [
      { id: 100, origenId: 1, destinoId: 2, etiqueta: null, condicion: null },
      { id: 101, origenId: 2, destinoId: 3, etiqueta: 'Sí', condicion: null },
      { id: 102, origenId: 2, destinoId: 999, etiqueta: null, condicion: null },   // destino ya no existe: no se dibuja
    ]);
    fixture.componentRef.setInput('mensajes', [mensaje]);
    fixture.componentRef.setInput('advertencias', [
      { codigo: 'SIN_SALIDA', severidad: 'ERROR', mensaje: '', elementoId: 3 },
      { codigo: 'CORRELACION_FALTANTE', severidad: 'AVISO', mensaje: '', elementoId: 2 },
      { codigo: 'SIN_FIN', severidad: 'ERROR', mensaje: '', elementoId: 1 },
    ]);
    fixture.detectChanges();
    html = fixture.nativeElement;
  });

  it('dibuja pools, lanes, elementos, arcos y el flujo de mensaje con su correlación', () => {
    expect(html.querySelectorAll('rect.pool').length).toBe(2);
    expect(html.textContent).toContain('Empleado');
    expect(html.textContent).toContain('caja negra');
    expect(html.querySelectorAll('g.nodo').length).toBe(5);
    expect(html.querySelectorAll('g.arco').length).toBe(2);
    expect(html.querySelector('g.arco .etiqueta')!.textContent).toContain('Sí');
    expect(html.querySelector('g.flujo-mensaje .linea')!.getAttribute('marker-end')).toBe('url(#flecha-mensaje)');
    expect(html.querySelector('g.flujo-mensaje')!.textContent).toContain('clave: numeroSolicitud');
  });

  it('usa el símbolo BPMN de cada tipo', () => {
    const nodo = (id: number) => html.querySelector(`g.nodo[data-nodo="${id}"]`)!;
    expect(nodo(1).querySelector('circle.evento-inicio')).not.toBeNull();
    expect(nodo(2).querySelector('rect.forma')).not.toBeNull();
    expect(nodo(2).querySelector('.icono')!.textContent).toBe('');
    expect(nodo(3).querySelector('polygon.forma')).not.toBeNull();
    expect(nodo(3).querySelector('path.marca')).not.toBeNull();
    expect(nodo(4).querySelector('circle.forma-interna')).not.toBeNull();   // intermedio: doble círculo
    expect(nodo(4).querySelector('.sobre.sobre-lleno')).not.toBeNull();      // envía: sobre lleno
    expect(nodo(5).querySelector('circle.evento-fin')).not.toBeNull();
  });

  it('pinta errores y avisos sin confundir el id de un pool con el de un elemento', () => {
    expect(html.querySelector('g.nodo[data-nodo="3"]')!.classList).toContain('con-error');
    expect(html.querySelector('g.nodo[data-nodo="2"]')!.classList).toContain('con-aviso');
    expect(html.querySelector('g.nodo[data-nodo="1"]')!.classList).not.toContain('con-error');
    expect(html.querySelector('rect.pool[data-pool="1"]')!.classList).toContain('con-error');
  });

  it('un clic en un elemento avisa su id y no coloca nada en el lienzo', () => {
    const nodos: number[] = [];
    const lienzo: Posicion[] = [];
    fixture.componentInstance.clicNodo.subscribe((id) => nodos.push(id));
    fixture.componentInstance.clicLienzo.subscribe((p) => lienzo.push(p));
    html.querySelector('g.nodo[data-nodo="2"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(nodos).toEqual([2]);
    expect(lienzo).toEqual([]);
  });

  it('un clic en el fondo avisa pool, lane y posición', () => {
    const lienzo: Posicion[] = [];
    fixture.componentInstance.clicLienzo.subscribe((p) => lienzo.push(p));
    const svg = html.querySelector<SVGSVGElement>('#lienzoDiagrama')!;
    const caja = svg.getBoundingClientRect();
    svg.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: caja.left + 20 + 60 + 200, clientY: caja.top + 20 + 65 }));
    expect(lienzo.length).toBe(1);
    expect(lienzo[0].pool.id).toBe(1);
    expect(lienzo[0].lane?.id).toBe(10);
    expect(lienzo[0].posX).toBe(200);
    expect(lienzo[0].posY).toBe(0);
  });

  it('clic en arcos y mensajes avisa su id', () => {
    const arcos: number[] = [];
    const mensajes: number[] = [];
    fixture.componentInstance.clicArco.subscribe((id) => arcos.push(id));
    fixture.componentInstance.clicMensaje.subscribe((id) => mensajes.push(id));
    html.querySelector('g.arco[data-arco="101"]')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    html.querySelector('g.flujo-mensaje')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(arcos).toEqual([101]);
    expect(mensajes).toEqual([50]);
  });
});
