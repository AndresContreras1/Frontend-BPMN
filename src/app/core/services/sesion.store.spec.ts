import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { LoginResponse } from '../../models/usuario.model';
import { problemaDe } from './errores';
import { SesionStore } from './sesion.store';

describe('SesionStore', () => {
  const login = (rol: 'ADMINISTRADOR' | 'EDITOR' | 'LECTOR'): LoginResponse => ({
    token: 't', tipo: 'Bearer', expiraEnSegundos: 1800,
    usuario: { id: 1, nombre: 'Ana', correo: 'ana@a.com', rol, empresaId: 3, empresaNombre: 'Empresa A' },
  });

  beforeEach(() => localStorage.clear());

  it('inicia y cierra la sesión', () => {
    const sesion = TestBed.inject(SesionStore);
    sesion.iniciar(login('EDITOR'));

    expect(sesion.autenticado()).toBeTrue();
    expect(sesion.usuario()?.empresaNombre).toBe('Empresa A');
    expect(localStorage.getItem('token')).toBe('t');

    sesion.cerrar();
    expect(sesion.autenticado()).toBeFalse();
    expect(localStorage.getItem('usuario')).toBeNull();
  });

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

describe('problemaDe', () => {
  it('sin conexión', () => {
    expect(problemaDe(new HttpErrorResponse({ status: 0 })).title).toBe('Sin conexión');
  });

  it('respeta el ProblemDetail del backend', () => {
    const p = problemaDe(new HttpErrorResponse({ status: 409, error: { title: 'Regla de negocio', detail: 'Ya existe', detalles: ['A'] } }));
    expect(p.detail).toBe('Ya existe');
    expect(p.detalles).toEqual(['A']);
  });

  it('un 500 sin cuerpo no muestra detalles técnicos', () => {
    expect(problemaDe(new HttpErrorResponse({ status: 500, error: 'stack trace' })).detail).toContain('inesperado');
  });
});
