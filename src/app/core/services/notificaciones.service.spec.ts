import { TestBed } from '@angular/core/testing';

import { NotificacionesService } from './notificaciones.service';

describe('NotificacionesService', () => {
  let servicio: NotificacionesService;

  beforeEach(() => {
    jasmine.clock().install();
    servicio = TestBed.inject(NotificacionesService);
  });

  afterEach(() => jasmine.clock().uninstall());

  it('agrega cada aviso con su tipo y lo retira solo después de unos segundos', () => {
    servicio.exito('Proceso creado');
    servicio.error('No se pudo guardar');

    expect(servicio.avisos().map((a) => [a.tipo, a.mensaje])).toEqual([
      ['exito', 'Proceso creado'],
      ['error', 'No se pudo guardar'],
    ]);

    jasmine.clock().tick(NotificacionesService.DURACION_MS);
    expect(servicio.avisos()).toEqual([]);
  });

  it('se puede cerrar un aviso antes de tiempo sin tocar los demás', () => {
    servicio.info('Uno');
    servicio.info('Dos');
    servicio.cerrar(servicio.avisos()[0].id);

    expect(servicio.avisos().map((a) => a.mensaje)).toEqual(['Dos']);
  });
});
