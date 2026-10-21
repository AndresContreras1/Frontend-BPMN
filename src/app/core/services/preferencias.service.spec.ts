import { TestBed } from '@angular/core/testing';

import { PreferenciasService } from './preferencias.service';

describe('PreferenciasService', () => {
  const VISTAS = ['tabla', 'tarjetas'] as const;
  let preferencias: PreferenciasService;

  beforeEach(() => {
    localStorage.clear();
    preferencias = TestBed.inject(PreferenciasService);
  });

  it('guarda y recupera una preferencia permitida', () => {
    preferencias.guardar('vistaProcesos', 'tarjetas');
    expect(preferencias.leer('vistaProcesos', VISTAS, 'tabla')).toBe('tarjetas');
  });

  it('un valor desconocido o ausente vuelve al valor por defecto', () => {
    expect(preferencias.leer('vistaProcesos', VISTAS, 'tabla')).toBe('tabla');
    localStorage.setItem('preferencia.vistaProcesos', 'otra-cosa');
    expect(preferencias.leer('vistaProcesos', VISTAS, 'tabla')).toBe('tabla');
  });

  it('si el navegador no deja usar localStorage, la app sigue con el valor por defecto', () => {
    spyOn(localStorage, 'getItem').and.throwError('bloqueado');
    spyOn(localStorage, 'setItem').and.throwError('bloqueado');

    expect(() => preferencias.guardar('vistaProcesos', 'tarjetas')).not.toThrow();
    expect(preferencias.leer('vistaProcesos', VISTAS, 'tabla')).toBe('tabla');
  });
});
