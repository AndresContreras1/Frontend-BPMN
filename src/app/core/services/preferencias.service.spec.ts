import { TestBed } from '@angular/core/testing';

import { PreferenciasService } from './preferencias.service';

/** Pruebas del servicio que recuerda preferencias del usuario (por ejemplo la vista de procesos) en localStorage. */
describe('PreferenciasService', () => {
  // Valores permitidos para la preferencia de vista
  const VISTAS = ['tabla', 'tarjetas'] as const;
  let preferencias: PreferenciasService;

  // Antes de cada prueba: se vacía localStorage para que no haya datos de otras pruebas
  beforeEach(() => {
    localStorage.clear();
    preferencias = TestBed.inject(PreferenciasService);
  });

  // Escenario: se guarda un valor válido y se lee.
  // Esperado: se obtiene el mismo valor guardado.
  it('guarda y recupera una preferencia permitida', () => {
    preferencias.guardar('vistaProcesos', 'tarjetas');
    expect(preferencias.leer('vistaProcesos', VISTAS, 'tabla')).toBe('tarjetas');
  });

  // Escenario: no hay nada guardado, o hay un valor que no está en la lista permitida.
  // Esperado: se devuelve el valor por defecto ('tabla').
  it('un valor desconocido o ausente vuelve al valor por defecto', () => {
    expect(preferencias.leer('vistaProcesos', VISTAS, 'tabla')).toBe('tabla');
    // Se escribe directamente en localStorage un valor inválido
    localStorage.setItem('preferencia.vistaProcesos', 'otra-cosa');
    expect(preferencias.leer('vistaProcesos', VISTAS, 'tabla')).toBe('tabla');
  });

  // Escenario: el navegador bloquea localStorage (modo privado, por ejemplo).
  // Esperado: ni guardar ni leer lanzan error; se usa el valor por defecto.
  it('si el navegador no deja usar localStorage, la app sigue con el valor por defecto', () => {
    // spyOn reemplaza el método real por uno falso que lanza una excepción
    spyOn(localStorage, 'getItem').and.throwError('bloqueado');
    spyOn(localStorage, 'setItem').and.throwError('bloqueado');

    expect(() => preferencias.guardar('vistaProcesos', 'tarjetas')).not.toThrow();
    expect(preferencias.leer('vistaProcesos', VISTAS, 'tabla')).toBe('tabla');
  });
});
