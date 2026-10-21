import { TestBed } from '@angular/core/testing';

import { NotificacionesService } from './notificaciones.service';

/** Pruebas del servicio que administra la lista de avisos (toasts) y su cierre automático. */
describe('NotificacionesService', () => {
  let servicio: NotificacionesService;

  beforeEach(() => {
    // jasmine.clock reemplaza los temporizadores reales: así se puede "avanzar" el tiempo sin esperar
    jasmine.clock().install();
    servicio = TestBed.inject(NotificacionesService);
  });

  // Se restauran los temporizadores reales al terminar cada prueba
  afterEach(() => jasmine.clock().uninstall());

  // Escenario: se publican un aviso de éxito y uno de error.
  // Esperado: ambos quedan en la lista con su tipo y desaparecen solos pasada la duración.
  it('agrega cada aviso con su tipo y lo retira solo después de unos segundos', () => {
    servicio.exito('Proceso creado');
    servicio.error('No se pudo guardar');

    // avisos() es un signal: se llama como función para leer su valor actual
    expect(servicio.avisos().map((a) => [a.tipo, a.mensaje])).toEqual([
      ['exito', 'Proceso creado'],
      ['error', 'No se pudo guardar'],
    ]);

    // tick adelanta el reloj simulado el tiempo que dura un aviso
    jasmine.clock().tick(NotificacionesService.DURACION_MS);
    expect(servicio.avisos()).toEqual([]);
  });

  // Escenario: hay dos avisos y se cierra el primero a mano.
  // Esperado: solo queda el segundo.
  it('se puede cerrar un aviso antes de tiempo sin tocar los demás', () => {
    servicio.info('Uno');
    servicio.info('Dos');
    servicio.cerrar(servicio.avisos()[0].id);

    expect(servicio.avisos().map((a) => a.mensaje)).toEqual(['Dos']);
  });
});
