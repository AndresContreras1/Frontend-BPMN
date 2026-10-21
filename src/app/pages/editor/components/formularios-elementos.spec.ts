import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Mensaje } from '../../../models/mensaje.model';
import { Nodo } from '../../../models/nodo.model';
import { Pool } from '../../../models/pool.model';
import { ActividadFormComponent } from './actividad-form/actividad-form.component';
import { ArcoFormComponent, DatosArco } from './arco-form/arco-form.component';
import { CorrelacionFormComponent } from './correlacion-form/correlacion-form.component';
import { EventoFormComponent } from './evento-form/evento-form.component';
import { GatewayFormComponent } from './gateway-form/gateway-form.component';
import { GuardarMensaje, MensajeFormComponent } from './mensaje-form/mensaje-form.component';

// Datos de ejemplo compartidos: dos lanes, la ubicación donde se hizo clic en el lienzo y los campos comunes de un nodo
const lanes = [{ id: 10, poolId: 1, rolProcesoId: 1, nombre: 'Empleado', orden: 0 }, { id: 11, poolId: 1, rolProcesoId: 2, nombre: 'Jefe', orden: 1 }];
const ubicacion = { poolId: 1, laneId: 11, posX: 200, posY: 30 };
const base = { poolId: 1, laneId: 10, tipoActividad: null, tipoGateway: null, variante: null, posX: 100, posY: 0 };

// Ayuda: simula que el usuario escribe o elige un valor en un campo (lanza los eventos "input" y "change")
const escribir = (html: HTMLElement, selector: string, valor: string) => {
  const e = html.querySelector<HTMLInputElement | HTMLSelectElement>(selector)!;
  e.value = valor;
  e.dispatchEvent(new Event('input'));
  e.dispatchEvent(new Event('change'));
};

// Ayuda genérica: crea cualquier componente de formulario y le asigna sus inputs con setInput
function crear<T>(tipo: Type<T>, entradas: Record<string, unknown>): ComponentFixture<T> {
  const fixture = TestBed.createComponent(tipo);
  for (const [clave, valor] of Object.entries(entradas)) {
    fixture.componentRef.setInput(clave, valor);
  }
  fixture.detectChanges();
  return fixture;
}

/** Pruebas del formulario de eventos de inicio y fin. */
describe('EventoFormComponent', () => {
  // Esperado: un evento nuevo toma la lane y la posición del clic; sin nombre emite null.
  it('un evento nuevo toma la ubicación del clic; el nombre vacío viaja como null', () => {
    const fixture = crear(EventoFormComponent, { ubicacion, lanes, tipoInicial: 'FIN' });
    const emitidos: unknown[] = [];
    fixture.componentInstance.guardar.subscribe((e) => emitidos.push(e));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('#guardarEventoBtn').click();
    expect(emitidos).toEqual([{ tipo: 'FIN', nombre: null, laneId: 11, posX: 200, posY: 30 }]);
  });

  // Esperado: con editable=false se ve el nombre del evento en un campo deshabilitado y no hay botón de guardar.
  it('el lector ve los datos sin poder guardar', () => {
    const nodo: Nodo = { ...base, id: 1, tipo: 'EVENTO_INICIO', nombre: 'Solicitud' };
    const fixture = crear(EventoFormComponent, { nodo, lanes, editable: false });
    const html: HTMLElement = fixture.nativeElement;
    expect(html.querySelector<HTMLInputElement>('#eventoNombre')!.value).toBe('Solicitud');
    expect(html.querySelector<HTMLInputElement>('#eventoNombre')!.disabled).toBeTrue();
    expect(html.querySelector('#guardarEventoBtn')).toBeNull();
  });
});

/** Pruebas del formulario de actividades (HU-08, HU-09). */
describe('ActividadFormComponent (HU-08, HU-09)', () => {
  // Escenario: se edita una actividad, primero con el nombre vacío y luego con nombre y otra lane.
  // Esperado: vacío, el botón está deshabilitado y se pide el nombre; completo, se emite con el nombre limpio y la lane nueva.
  it('exige nombre y lane (el botón no se habilita sin ellos); cambiar la lane cambia el responsable', () => {
    const nodo: Nodo = { ...base, id: 2, tipo: 'ACTIVIDAD', nombre: 'Revisar', tipoActividad: 'USUARIO' };
    const fixture = crear(ActividadFormComponent, { nodo, lanes });
    const html: HTMLElement = fixture.nativeElement;
    const emitidos: unknown[] = [];
    fixture.componentInstance.guardar.subscribe((e) => emitidos.push(e));

    escribir(html, '#actividadNombre', '');
    html.querySelector('#actividadNombre')!.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(html.querySelector<HTMLButtonElement>('#guardarActividadBtn')!.disabled).toBeTrue();
    expect(emitidos.length).toBe(0);
    expect(html.textContent).toContain('Este campo es obligatorio');

    escribir(html, '#actividadNombre', ' Revisar solicitud ');
    fixture.componentInstance.actividadForm.controls.laneId.setValue(11);
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#guardarActividadBtn')!.click();
    expect(emitidos).toEqual([{ nombre: 'Revisar solicitud', tipoActividad: 'USUARIO', laneId: 11, posX: 100, posY: 0 }]);
  });
});

/** Pruebas del formulario de gateways (HU-14, HU-15). */
describe('GatewayFormComponent (HU-14, HU-15)', () => {
  // Esperado: se explica lo que hace cada tipo de gateway y al guardar se emite el tipo elegido con la lane de la ubicación.
  it('explica cada tipo y emite el gateway con su lane', () => {
    const fixture = crear(GatewayFormComponent, { ubicacion, lanes });
    const html: HTMLElement = fixture.nativeElement;
    expect(html.textContent).toContain('Sigue un solo camino');
    escribir(html, '#gatewayTipo', 'PARALELO');
    fixture.detectChanges();
    expect(html.textContent).toContain('Sigue todos los caminos');

    const emitidos: unknown[] = [];
    fixture.componentInstance.guardar.subscribe((e) => emitidos.push(e));
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#guardarGatewayBtn')!.click();
    expect(emitidos).toEqual([{ nombre: null, tipoGateway: 'PARALELO', laneId: 11, posX: 200, posY: 30 }]);
  });
});

/** Pruebas del formulario de arcos (flujos de secuencia entre elementos) (HU-11, HU-12). */
describe('ArcoFormComponent (HU-11, HU-12)', () => {
  // Nodos de ejemplo: incluye uno de otro pool, un gateway exclusivo, uno paralelo y eventos de inicio y fin
  const nodos: Nodo[] = [
    { ...base, id: 1, tipo: 'EVENTO_INICIO', nombre: null },
    { ...base, id: 2, tipo: 'GATEWAY', nombre: '¿Aprobada?', tipoGateway: 'EXCLUSIVO' },
    { ...base, id: 3, tipo: 'ACTIVIDAD', nombre: 'Aprobar' },
    { ...base, id: 4, tipo: 'EVENTO_FIN', nombre: 'Fin' },
    { ...base, id: 5, poolId: 2, laneId: 20, tipo: 'ACTIVIDAD', nombre: 'De otro pool' },
    { ...base, id: 6, tipo: 'GATEWAY', nombre: 'Paralelo', tipoGateway: 'PARALELO' },
  ];

  // Esperado: desde un gateway exclusivo se pide condición, los destinos son solo del mismo pool (sin eventos
  // de inicio) y al guardar se emite el arco con etiqueta y condición.
  it('desde un gateway exclusivo pide condición y solo ofrece destinos del mismo pool', () => {
    const fixture = crear(ArcoFormComponent, { origenId: 2, destinoId: 3, nodos });
    const html: HTMLElement = fixture.nativeElement;
    const destinos = [...html.querySelectorAll('#arcoDestino option')].map((o) => o.textContent!.trim());
    expect(destinos).not.toContain('De otro pool (Actividad)');
    expect(destinos.some((d) => d.startsWith('Inicio'))).toBeFalse();
    expect(html.querySelector('#arcoCondicion')).not.toBeNull();

    const emitidos: DatosArco[] = [];
    fixture.componentInstance.guardar.subscribe((e) => emitidos.push(e));
    escribir(html, '#arcoEtiqueta', 'Sí');
    escribir(html, '#arcoCondicion', 'aprobada == true');
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#guardarArcoBtn')!.click();
    expect(emitidos).toEqual([{ origenId: 2, destinoId: 3, etiqueta: 'Sí', condicion: 'aprobada == true' }]);
  });

  // Esperado: desde un gateway paralelo no hay campo de condición y aunque el control tenga un valor se emite null.
  it('desde un gateway paralelo o una actividad no envía condición', () => {
    const fixture = crear(ArcoFormComponent, { origenId: 6, destinoId: 3, nodos });
    const html: HTMLElement = fixture.nativeElement;
    expect(html.querySelector('#arcoCondicion')).toBeNull();
    expect(html.textContent).toContain('no llevan condición');
    const emitidos: DatosArco[] = [];
    fixture.componentInstance.guardar.subscribe((e) => emitidos.push(e));
    fixture.componentInstance.arcoForm.controls.condicion.setValue('algo');
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#guardarArcoBtn')!.click();
    expect(emitidos[0].condicion).toBeNull();
  });

  // Esperado: un evento de fin no puede ser origen de un arco, así que no está en la lista de orígenes.
  it('el fin no aparece como origen', () => {
    const fixture = crear(ArcoFormComponent, { origenId: 1, destinoId: 3, nodos });
    expect(fixture.componentInstance.origenes().map((n) => n.id)).not.toContain(4);
  });
});

/** Pruebas del formulario de mensajes: envío (throw), recepción (catch) y notificación externa (HU-25 a HU-27). */
describe('MensajeFormComponent (HU-25 a HU-27)', () => {
  // Tres pools de ejemplo: el propio, uno de proveedor y un sistema externo de caja negra
  const pools: Pool[] = [
    { id: 1, procesoId: 9, nombre: 'Facimus', tipo: 'PROPIETARIO', cajaNegra: false, orden: 0, permisoEstructura: 'ADMINISTRADOR_Y_EDITOR', lanes },
    { id: 2, procesoId: 9, nombre: 'Proveedor', tipo: 'PROVEEDOR', cajaNegra: false, orden: 1, permisoEstructura: 'ADMINISTRADOR_Y_EDITOR', lanes: [] },
    { id: 3, procesoId: 9, nombre: 'Correo', tipo: 'SISTEMA_EXTERNO', cajaNegra: true, orden: 2, permisoEstructura: 'ADMINISTRADOR_Y_EDITOR', lanes: [] },
  ];
  const nodos: Nodo[] = [
    { ...base, id: 7, tipo: 'ACTIVIDAD', nombre: 'Registrar' },
    { ...base, id: 8, tipo: 'ACTIVIDAD', nombre: 'Atender fallo' },
  ];
  // Ayuda: pulsa guardar y devuelve lo que el componente emitió por su output "guardar"
  const emitir = (fixture: ComponentFixture<MensajeFormComponent>) => {
    const emitidos: GuardarMensaje[] = [];
    fixture.componentInstance.guardar.subscribe((e) => emitidos.push(e));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('#guardarMensajeBtn').click();
    fixture.detectChanges();
    return emitidos;
  };

  // Esperado: un mensaje de envío ofrece como destino los otros pools; con nombre, un campo y clave de
  // correlación se emite el mensaje completo.
  it('throw nuevo: destino entre los otros pools, campos y clave de correlación', () => {
    const fixture = crear(MensajeFormComponent, { clase: 'THROW', ubicacion, pools, nodos });
    const html: HTMLElement = fixture.nativeElement;
    expect([...html.querySelectorAll('#mensajeDestino option')].map((o) => o.textContent!.trim())).toEqual(['Proveedor', 'Correo (caja negra)']);
    escribir(html, '#mensajeNombre', 'OrdenDeCompra');
    escribir(html, '#mensajeClave', 'numeroOrden');
    html.querySelector<HTMLButtonElement>('#agregarCampoBtn')!.click();
    fixture.detectChanges();
    escribir(html, '#mensajeForm .input-group input', 'numeroOrden');

    expect(emitir(fixture)).toEqual([{ tipo: 'throw', datos: {
      poolId: 1, laneId: 11, nombre: 'OrdenDeCompra', variante: 'INTERMEDIO', poolDestinoId: 2,
      campos: [{ nombre: 'numeroOrden', tipoDato: 'TEXTO' }], claveCorrelacion: 'numeroOrden', posX: 200, posY: 30,
    } }]);
  });

  // Esperado: un campo sin nombre, o dos campos con el mismo nombre (sin distinguir mayúsculas), no se emiten
  // y se muestra el error.
  it('no deja campos sin nombre ni repetidos', () => {
    const fixture = crear(MensajeFormComponent, { clase: 'THROW', ubicacion, pools, nodos });
    const html: HTMLElement = fixture.nativeElement;
    escribir(html, '#mensajeNombre', 'Orden');
    html.querySelector<HTMLButtonElement>('#agregarCampoBtn')!.click();
    fixture.detectChanges();
    expect(emitir(fixture).length).toBe(0);
    expect(html.querySelector('#errorMensajeForm')!.textContent).toContain('necesita un nombre');

    fixture.componentInstance.campos.set([{ nombre: 'id', tipoDato: 'TEXTO' }, { nombre: 'ID', tipoDato: 'NUMERO' }]);
    expect(emitir(fixture).length).toBe(0);
    expect(html.querySelector('#errorMensajeForm')!.textContent).toContain('repetido');
  });

  // Esperado: un mensaje de recepción ofrece las variantes INICIO e INTERMEDIO, no tiene destino y guarda
  // las actividades que usan sus datos.
  it('catch nuevo: variantes de inicio o intermedio y actividades que usan los datos', () => {
    const fixture = crear(MensajeFormComponent, { clase: 'CATCH', ubicacion, pools, nodos });
    const html: HTMLElement = fixture.nativeElement;
    expect([...html.querySelectorAll('#mensajeVariante option')].map((o) => (o as HTMLOptionElement).value)).toEqual(['INICIO', 'INTERMEDIO']);
    expect(html.querySelector('#mensajeDestino')).toBeNull();
    escribir(html, '#mensajeNombre', 'Despacho');
    html.querySelector<HTMLInputElement>('#usaDatos-7')!.click();
    const [evento] = emitir(fixture);
    expect(evento.tipo).toBe('catch');
    expect(evento.tipo === 'catch' && evento.datos.actividadesQueUsanIds).toEqual([7]);
  });

  // Esperado: la notificación externa solo ofrece pools de caja negra; si la política de fallo deriva a una
  // actividad, esa actividad es obligatoria.
  it('notificación externa: solo pools de caja negra y la actividad de fallo si se deriva', () => {
    const fixture = crear(MensajeFormComponent, { clase: 'EXTERNO', ubicacion, pools, nodos });
    const html: HTMLElement = fixture.nativeElement;
    expect([...html.querySelectorAll('#mensajeDestino option')].map((o) => o.textContent!.trim())).toEqual(['Correo (caja negra)']);
    escribir(html, '#mensajeNombre', 'Aviso');
    escribir(html, '#mensajePolitica', 'DERIVAR_A_ACTIVIDAD');
    fixture.detectChanges();
    expect(emitir(fixture).length).toBe(0);
    expect(html.querySelector('#errorMensajeForm')!.textContent).toContain('actividad que atiende el fallo');

    fixture.componentInstance.mensajeForm.controls.actividadManejoErrorId.setValue(8);
    const [evento] = emitir(fixture);
    expect(evento.tipo === 'externo' && evento.datos.actividadManejoErrorId).toBe(8);
    expect(evento.tipo === 'externo' && evento.datos.poolDestinoId).toBe(3);
  });

  // Esperado: si la notificación se modela como tarea, falta el nombre de la tarea y no se emite.
  it('la notificación como tarea exige el nombre de la tarea', () => {
    const fixture = crear(MensajeFormComponent, { clase: 'EXTERNO', ubicacion, pools, nodos });
    const html: HTMLElement = fixture.nativeElement;
    html.querySelector<HTMLInputElement>('#elementoTarea')!.click();
    fixture.detectChanges();
    escribir(html, '#mensajeNombre', 'Aviso');
    expect(emitir(fixture).length).toBe(0);
    expect(html.querySelector('#errorMensajeForm')!.textContent).toContain('nombre de la tarea');
  });

  // Esperado: al actualizar, cada clase de mensaje envía solo los datos que le corresponden
  // (un envío no manda datos de recepción y una recepción no manda destino).
  it('editar un throw no envía datos de catch y editar un catch no envía destino', () => {
    const nodoThrow: Nodo = { ...base, id: 30, tipo: 'MESSAGE_THROW', nombre: 'Orden', variante: 'FIN' };
    const throwMsg: Mensaje = {
      id: 300, nodo: nodoThrow, direccion: 'ENVIO', nombre: 'Orden', poolOrigenId: 1, poolDestinoId: 2, nodoDestinoId: null,
      tipoDestino: null, momento: null, politicaFallo: null, actividadManejoErrorId: null, origenExterno: false,
      claveCorrelacion: null, accionSinCaso: null, campos: [], actividadesQueUsanIds: [],
    };
    const fixture = crear(MensajeFormComponent, { mensaje: throwMsg, pools, nodos });
    const [editado] = emitir(fixture);
    expect(editado.tipo).toBe('actualizar');
    if (editado.tipo === 'actualizar') {
      expect(editado.datos.poolDestinoId).toBe(2);
      expect(editado.datos.variante).toBe('FIN');
      expect(editado.datos.origenExterno).toBeUndefined();
      expect(editado.datos.tipoDestino).toBeUndefined();
    }

    const catchMsg: Mensaje = { ...throwMsg, id: 301, direccion: 'RECEPCION', nodo: { ...nodoThrow, tipo: 'MESSAGE_CATCH', variante: 'INICIO' } };
    fixture.componentRef.setInput('mensaje', catchMsg);
    fixture.detectChanges();
    const [catchEditado] = emitir(fixture);
    if (catchEditado.tipo === 'actualizar') {
      expect(catchEditado.datos.poolDestinoId).toBeUndefined();
      expect(catchEditado.datos.origenExterno).toBeFalse();
      expect(catchEditado.datos.actividadesQueUsanIds).toEqual([]);
    }
  });
});

/** Pruebas del formulario de correlación de un mensaje (HU-28). */
describe('CorrelacionFormComponent (HU-28)', () => {
  // Esperado: se proponen los campos del mensaje como clave; sin clave no se emite, y con clave y acción sí.
  it('propone los campos del mensaje y exige la clave', () => {
    const mensaje = {
      id: 1, nombre: 'Orden', claveCorrelacion: null, accionSinCaso: null, campos: [{ nombre: 'numeroOrden', tipoDato: 'TEXTO' }],
    } as unknown as Mensaje;
    const fixture = crear(CorrelacionFormComponent, { mensaje });
    const html: HTMLElement = fixture.nativeElement;
    expect(html.querySelector('#camposDelMensaje option')!.getAttribute('value')).toBe('numeroOrden');

    const emitidos: unknown[] = [];
    fixture.componentInstance.guardar.subscribe((e) => emitidos.push(e));
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#guardarCorrelacionBtn')!.click();
    expect(emitidos.length).toBe(0);
    escribir(html, '#correlacionClave', 'numeroOrden');
    escribir(html, '#correlacionAccion', 'INICIAR_CASO_NUEVO');
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#guardarCorrelacionBtn')!.click();
    expect(emitidos).toEqual([{ claveCorrelacion: 'numeroOrden', accionSinCaso: 'INICIAR_CASO_NUEVO' }]);
  });
});
