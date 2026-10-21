import { computed, inject, Injectable, signal } from '@angular/core';

import { LoginResponse, RolAcceso, UsuarioResumen } from '../../models/usuario.model';
import { TokenService } from './token.service';

/**
 * Estado compartido de la sesión (servicio singleton con signals): quién es el usuario,
 * de qué empresa y qué puede hacer según su rol de acceso.
 */
@Injectable({ providedIn: 'root' })
export class SesionStore {
  private readonly CLAVE_USUARIO = 'usuario';
  private readonly tokenService = inject(TokenService);

  private readonly _usuario = signal<UsuarioResumen | null>(this.leerUsuario());
  readonly usuario = this._usuario.asReadonly();

  readonly autenticado = computed(() => this._usuario() !== null && this.tokenService.hayToken());
  readonly rol = computed<RolAcceso | null>(() => this._usuario()?.rol ?? null);
  readonly esAdministrador = computed(() => this.rol() === 'ADMINISTRADOR');
  /** HU-05: administrador y editor modifican; el lector solo consulta. */
  readonly puedeEditar = computed(() => this.rol() === 'ADMINISTRADOR' || this.rol() === 'EDITOR');

  iniciar(respuesta: LoginResponse): void {
    this.tokenService.guardar(respuesta.token);
    localStorage.setItem(this.CLAVE_USUARIO, JSON.stringify(respuesta.usuario));
    this._usuario.set(respuesta.usuario);
  }

  actualizarUsuario(usuario: UsuarioResumen): void {
    localStorage.setItem(this.CLAVE_USUARIO, JSON.stringify(usuario));
    this._usuario.set(usuario);
  }

  cerrar(): void {
    this.tokenService.borrar();
    localStorage.removeItem(this.CLAVE_USUARIO);
    this._usuario.set(null);
  }

  private leerUsuario(): UsuarioResumen | null {
    const texto = localStorage.getItem(this.CLAVE_USUARIO);
    if (!texto || !this.tokenService.hayToken()) {
      return null;
    }
    try {
      return JSON.parse(texto) as UsuarioResumen;
    } catch {
      return null;
    }
  }
}
