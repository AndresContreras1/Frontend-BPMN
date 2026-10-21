import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Arco } from '../../../../models/arco.model';
import { Nodo } from '../../../../models/nodo.model';
import { CondicionArco, SalidasGatewayComponent } from './salidas-gateway.component';

describe('SalidasGatewayComponent (HU-15)', () => {
  const base = { poolId: 1, laneId: 10, tipoActividad: null, tipoGateway: null, variante: null, posX: 0, posY: 0 };
  const nodos: Nodo[] = [
    { ...base, id: 3, tipo: 'GATEWAY', nombre: '¿Aprobada?', tipoGateway: 'EXCLUSIVO' },
    { ...base, id: 4, tipo: 'ACTIVIDAD', nombre: 'Disfrutar vacaciones' },
    { ...base, id: 5, tipo: 'EVENTO_FIN', nombre: 'Rechazada' },
  ];
  const salidas: Arco[] = [
    { id: 100, origenId: 3, destinoId: 4, etiqueta: 'Sí', condicion: 'aprobada == true' },
    { id: 101, origenId: 3, destinoId: 5, etiqueta: 'No', condicion: null },
  ];

  const crear = (entradas: Record<string, unknown>) => {
    const fixture: ComponentFixture<SalidasGatewayComponent> = TestBed.createComponent(SalidasGatewayComponent);
    Object.entries(entradas).forEach(([clave, valor]) => fixture.componentRef.setInput(clave, valor));
    fixture.detectChanges();
    return fixture;
  };

  const escribir = (html: HTMLElement, id: string, valor: string) => {
    const input = html.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  };

  it('lista cada salida con su destino y su condición actual', () => {
    const html: HTMLElement = crear({ salidas, nodos, tipoGateway: 'EXCLUSIVO' }).nativeElement;

    expect(html.textContent).toContain('Hacia Disfrutar vacaciones');
    expect(html.textContent).toContain('Hacia Rechazada');
    expect(html.querySelector<HTMLInputElement>('#condicion-100')!.value).toBe('aprobada == true');
    expect(html.querySelector<HTMLInputElement>('#condicion-101')!.value).toBe('');
    expect(html.querySelector<HTMLButtonElement>('#guardarCondicionesBtn')!.disabled).toBeTrue();
  });

  it('emite solo las condiciones que cambiaron, limpias, y null para la que se borra', () => {
    const fixture = crear({ salidas, nodos, tipoGateway: 'INCLUSIVO' });
    const html: HTMLElement = fixture.nativeElement;
    const emitidos: CondicionArco[][] = [];
    fixture.componentInstance.guardar.subscribe((c) => emitidos.push(c));

    escribir(html, 'condicion-100', '  ');
    escribir(html, 'condicion-101', ' aprobada == false ');
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#guardarCondicionesBtn')!.click();

    expect(emitidos).toEqual([[
      { arco: salidas[0], condicion: null },
      { arco: salidas[1], condicion: 'aprobada == false' },
    ]]);
  });

  it('en un paralelo no pide condiciones: todos los caminos se siguen', () => {
    const html: HTMLElement = crear({ salidas, nodos, tipoGateway: 'PARALELO' }).nativeElement;

    expect(html.querySelector('#condicion-100')).toBeNull();
    expect(html.textContent).toContain('se siguen todos los caminos');
  });

  it('sin arcos salientes indica cómo conectarlo', () => {
    const html: HTMLElement = crear({ salidas: [], nodos, tipoGateway: 'EXCLUSIVO' }).nativeElement;

    expect(html.querySelector('#gatewaySinSalidas')).not.toBeNull();
  });

  it('en solo lectura muestra las condiciones sin permitir guardarlas', () => {
    const html: HTMLElement = crear({ salidas, nodos, tipoGateway: 'EXCLUSIVO', editable: false }).nativeElement;

    expect(html.querySelector<HTMLInputElement>('#condicion-100')!.disabled).toBeTrue();
    expect(html.querySelector('#guardarCondicionesBtn')).toBeNull();
  });
});
