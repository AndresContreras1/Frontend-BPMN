import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Arco } from '../../../../models/arco.model';
import { Nodo } from '../../../../models/nodo.model';
import { CondicionArco, SalidasGatewayComponent } from './salidas-gateway.component';

/** Pruebas del panel que edita las condiciones de las salidas de un gateway (HU-15). */
describe('SalidasGatewayComponent (HU-15)', () => {
  // Datos comunes de los nodos de ejemplo
  const base = { poolId: 1, laneId: 10, tipoActividad: null, tipoGateway: null, variante: null, posX: 0, posY: 0 };
  // Un gateway exclusivo que sale hacia una actividad y hacia un evento de fin
  const nodos: Nodo[] = [
    { ...base, id: 3, tipo: 'GATEWAY', nombre: '¿Aprobada?', tipoGateway: 'EXCLUSIVO' },
    { ...base, id: 4, tipo: 'ACTIVIDAD', nombre: 'Disfrutar vacaciones' },
    { ...base, id: 5, tipo: 'EVENTO_FIN', nombre: 'Rechazada' },
  ];
  // Las dos salidas del gateway: una con condición y otra sin ella
  const salidas: Arco[] = [
    { id: 100, origenId: 3, destinoId: 4, etiqueta: 'Sí', condicion: 'aprobada == true' },
    { id: 101, origenId: 3, destinoId: 5, etiqueta: 'No', condicion: null },
  ];

  // Ayuda: crea el componente y le asigna las entradas con setInput (como haría el padre)
  const crear = (entradas: Record<string, unknown>) => {
    const fixture: ComponentFixture<SalidasGatewayComponent> = TestBed.createComponent(SalidasGatewayComponent);
    Object.entries(entradas).forEach(([clave, valor]) => fixture.componentRef.setInput(clave, valor));
    fixture.detectChanges();
    return fixture;
  };

  // Ayuda: simula que el usuario escribe en un input; se cambia el value y se lanza el evento "input"
  const escribir = (html: HTMLElement, id: string, valor: string) => {
    const input = html.querySelector<HTMLInputElement>(`#${id}`)!;
    input.value = valor;
    input.dispatchEvent(new Event('input'));
  };

  // Esperado: cada salida muestra su destino y su condición; el botón guardar está deshabilitado sin cambios.
  it('lista cada salida con su destino y su condición actual', () => {
    const html: HTMLElement = crear({ salidas, nodos, tipoGateway: 'EXCLUSIVO' }).nativeElement;

    expect(html.textContent).toContain('Hacia Disfrutar vacaciones');
    expect(html.textContent).toContain('Hacia Rechazada');
    expect(html.querySelector<HTMLInputElement>('#condicion-100')!.value).toBe('aprobada == true');
    expect(html.querySelector<HTMLInputElement>('#condicion-101')!.value).toBe('');
    expect(html.querySelector<HTMLButtonElement>('#guardarCondicionesBtn')!.disabled).toBeTrue();
  });

  // Escenario: se borra una condición (solo espacios) y se escribe otra con espacios sobrantes.
  // Esperado: el output "guardar" emite ambas: la borrada como null y la nueva sin espacios.
  it('emite solo las condiciones que cambiaron, limpias, y null para la que se borra', () => {
    const fixture = crear({ salidas, nodos, tipoGateway: 'INCLUSIVO' });
    const html: HTMLElement = fixture.nativeElement;
    const emitidos: CondicionArco[][] = [];
    // Guardamos lo que emita el output para compararlo al final
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

  // Esperado: en un gateway paralelo no hay campos de condición, solo un aviso.
  it('en un paralelo no pide condiciones: todos los caminos se siguen', () => {
    const html: HTMLElement = crear({ salidas, nodos, tipoGateway: 'PARALELO' }).nativeElement;

    expect(html.querySelector('#condicion-100')).toBeNull();
    expect(html.textContent).toContain('se siguen todos los caminos');
  });

  // Esperado: sin salidas aparece el mensaje que explica cómo conectar el gateway.
  it('sin arcos salientes indica cómo conectarlo', () => {
    const html: HTMLElement = crear({ salidas: [], nodos, tipoGateway: 'EXCLUSIVO' }).nativeElement;

    expect(html.querySelector('#gatewaySinSalidas')).not.toBeNull();
  });

  // Esperado: con editable=false los campos se ven deshabilitados y no existe el botón de guardar.
  it('en solo lectura muestra las condiciones sin permitir guardarlas', () => {
    const html: HTMLElement = crear({ salidas, nodos, tipoGateway: 'EXCLUSIVO', editable: false }).nativeElement;

    expect(html.querySelector<HTMLInputElement>('#condicion-100')!.disabled).toBeTrue();
    expect(html.querySelector('#guardarCondicionesBtn')).toBeNull();
  });
});
