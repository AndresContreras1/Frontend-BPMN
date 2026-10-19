import { Injectable } from '@angular/core';

/** Único punto de acceso al token en localStorage. */
@Injectable({ providedIn: 'root' })
export class TokenService {
  private readonly CLAVE = 'token';

  guardar(token: string): void {
    localStorage.setItem(this.CLAVE, token);
  }

  obtener(): string | null {
    return localStorage.getItem(this.CLAVE);
  }

  borrar(): void {
    localStorage.removeItem(this.CLAVE);
  }

  hayToken(): boolean {
    return this.obtener() !== null;
  }
}
