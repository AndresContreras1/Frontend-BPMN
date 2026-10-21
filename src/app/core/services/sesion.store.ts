import { computed, inject, Injectable, signal } from '@angular/core';

import { LoginResponse, RolAcceso, UsuarioResumen } from '../../models/usuario.model';
import { TokenService } from './token.service';

/**
 * Estado compartido de la sesión (servicio singleton con signals): quién es el usuario,
 * de qué empresa y qué puede hacer según su rol de acceso.
 */
@Injectable({ providedIn: 'root' })
export class SesionStore {
  /** Clave de localStorage donde se guardan los datos del usuario (el token va aparte, en TokenService). */
  private readonly CLAVE_USUARIO = 'usuario';
  /** Servicio que guarda y lee el token. */
  private readonly tokenService = inject(TokenService);

  /** Usuario de la sesión; se inicializa con lo guardado para que la sesión sobreviva a recargar la página. */
  private readonly _usuario = signal<UsuarioResumen | null>(this.leerUsuario());
  /** Usuario actual en solo lectura (null si no hay sesión). */
  readonly usuario = this._usuario.asReadonly();

  /** Hay sesión cuando existe el usuario y también el token. */
  readonly autenticado = computed(() => this._usuario() !== null && this.tokenService.hayToken());
  /** Rol de acceso del usuario, o null si no hay sesión. */
  readonly rol = computed<RolAcceso | null>(() => this._usuario()?.rol ?? null);
  /** True si el usuario es administrador. */
  readonly esAdministrador = computed(() => this.rol() === 'ADMINISTRADOR');
  /** HU-05: administrador y editor modifican; el lector solo consulta. */
  readonly puedeEditar = computed(() => this.rol() === 'ADMINISTRADOR' || this.rol() === 'EDITOR');

  /** Inicia la sesión con la respuesta del login: guarda el token y el usuario. */
  iniciar(respuesta: LoginResponse): void {
    this.tokenService.guardar(respuesta.token);
    // El usuario se guarda como texto JSON porque localStorage solo guarda strings
    localStorage.setItem(this.CLAVE_USUARIO, JSON.stringify(respuesta.usuario));
    this._usuario.set(respuesta.usuario);
  }

  /** Actualiza los datos del usuario (por ejemplo, tras editar el perfil) sin tocar el token. */
  actualizarUsuario(usuario: UsuarioResumen): void {
    localStorage.setItem(this.CLAVE_USUARIO, JSON.stringify(usuario));
    this._usuario.set(usuario);
  }

  /** Cierra la sesión: borra token y usuario, tanto del almacenamiento como del estado. */
  cerrar(): void {
    this.tokenService.borrar();
    localStorage.removeItem(this.CLAVE_USUARIO);
    this._usuario.set(null);
  }

  /** Recupera el usuario guardado al arrancar la app; devuelve null si no hay datos válidos o falta el token. */
  private leerUsuario(): UsuarioResumen | null {
    const texto = localStorage.getItem(this.CLAVE_USUARIO);
    // Sin usuario guardado o sin token no hay sesión que recuperar
    if (!texto || !this.tokenService.hayToken()) {
      return null;
    }
    // JSON.parse falla si el texto está dañado; en ese caso se trata como sin sesión
    try {
      return JSON.parse(texto) as UsuarioResumen;
    } catch {
      return null;
    }
  }
}
