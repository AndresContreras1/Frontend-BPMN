import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { LoginResponse } from '../../models/usuario.model';
import { problemaDe } from './errores';
import { SesionStore } from './sesion.store';

/** Pruebas del almacén de sesión: inicio y cierre de sesión y permisos según el rol. */
describe('SesionStore', () => {
  // Ayuda: construye una respuesta de login falsa con el rol indicado
  const login = (rol: 'ADMINISTRADOR' | 'EDITOR' | 'LECTOR'): LoginResponse => ({
    token: 't', tipo: 'Bearer', expiraEnSegundos: 1800,
    usuario: { id: 1, nombre: 'Ana', correo: 'ana@a.com', rol, empresaId: 3, empresaNombre: 'Empresa A' },
  });

  // Se limpia localStorage antes de cada prueba para que no arrastre sesiones anteriores
  beforeEach(() => localStorage.clear());

  // Escenario: se inicia sesión y luego se cierra.
  // Esperado: al iniciar queda autenticado y guardado en localStorage; al cerrar se borra todo.
  it('inicia y cierra la sesión', () => {
    const sesion = TestBed.inject(SesionStore);
    sesion.iniciar(login('EDITOR'));

    // autenticado() y usuario() son signals, por eso se leen llamándolos como función
    expect(sesion.autenticado()).toBeTrue();
    expect(sesion.usuario()?.empresaNombre).toBe('Empresa A');
    expect(localStorage.getItem('token')).toBe('t');

    sesion.cerrar();
    expect(sesion.autenticado()).toBeFalse();
    expect(localStorage.getItem('usuario')).toBeNull();
  });

  // Escenario: se inicia sesión primero como lector y luego como administrador.
  // Esperado: el lector no puede editar ni administrar; el administrador sí.
  it('calcula los permisos del rol de acceso', () => {
    const sesion = TestBed.inject(SesionStore);
    sesion.iniciar(login('LECTOR'));
    expect(sesion.puedeEditar()).toBeFalse();
    expect(sesion.esAdministrador()).toBeFalse();

    sesion.iniciar(login('ADMINISTRADOR'));
    expect(sesion.puedeEditar()).toBeTrue();
    expect(sesion.esAdministrador()).toBeTrue();
  });
});

/** Pruebas de la función que convierte un error HTTP en un mensaje entendible para el usuario. */
describe('problemaDe', () => {
  // Estado 0 significa que la petición ni siquiera llegó al servidor.
  it('sin conexión', () => {
    expect(problemaDe(new HttpErrorResponse({ status: 0 })).title).toBe('Sin conexión');
  });

  // Si el backend manda un ProblemDetail, se conservan su detalle y su lista de detalles.
  it('respeta el ProblemDetail del backend', () => {
    const p = problemaDe(new HttpErrorResponse({ status: 409, error: { title: 'Regla de negocio', detail: 'Ya existe', detalles: ['A'] } }));
    expect(p.detail).toBe('Ya existe');
    expect(p.detalles).toEqual(['A']);
  });

  // Un 500 con texto crudo no debe filtrar la traza al usuario: se muestra un mensaje genérico.
  it('un 500 sin cuerpo no muestra detalles técnicos', () => {
    expect(problemaDe(new HttpErrorResponse({ status: 500, error: 'stack trace' })).detail).toContain('inesperado');
  });
});
