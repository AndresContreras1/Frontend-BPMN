import { Injectable } from '@angular/core';

/** Único punto de acceso al token en localStorage. */
@Injectable({ providedIn: 'root' })
export class TokenService {
  /** Clave bajo la que se guarda el token. */
  private readonly CLAVE = 'token';

  /** Guarda el token recibido al iniciar sesión. */
  guardar(token: string): void {
    localStorage.setItem(this.CLAVE, token);
  }

  /** Devuelve el token guardado, o null si no hay. */
  obtener(): string | null {
    return localStorage.getItem(this.CLAVE);
  }

  /** Elimina el token (al cerrar sesión). */
  borrar(): void {
    localStorage.removeItem(this.CLAVE);
  }

  /** Indica si hay un token guardado. */
  hayToken(): boolean {
    return this.obtener() !== null;
  }
}
