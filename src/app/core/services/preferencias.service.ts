import { Injectable } from '@angular/core';

/**
 * Preferencias de la interfaz que no necesita el servidor (por ejemplo, ver la lista como tabla o como
 * tarjetas). Viven en localStorage; si el navegador no lo permite (modo privado), se usa el valor por defecto.
 */
@Injectable({ providedIn: 'root' })
export class PreferenciasService {
  private readonly PREFIJO = 'preferencia.';

  leer<T extends string>(clave: string, permitidos: readonly T[], porDefecto: T): T {
    try {
      const valor = localStorage.getItem(this.PREFIJO + clave);
      return permitidos.find((p) => p === valor) ?? porDefecto;
    } catch {
      return porDefecto;
    }
  }

  guardar(clave: string, valor: string): void {
    try {
      localStorage.setItem(this.PREFIJO + clave, valor);
    } catch {
      // Sin almacenamiento disponible la preferencia dura solo mientras la página está abierta
    }
  }
}
