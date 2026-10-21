import { Injectable } from '@angular/core';

/**
 * Preferencias de la interfaz que no necesita el servidor (por ejemplo, ver la lista como tabla o como
 * tarjetas). Viven en localStorage; si el navegador no lo permite (modo privado), se usa el valor por defecto.
 */
@Injectable({ providedIn: 'root' })
export class PreferenciasService {
  /** Prefijo para que las claves de las preferencias no choquen con otras del localStorage (como el token). */
  private readonly PREFIJO = 'preferencia.';

  /** Lee una preferencia; solo acepta uno de los valores permitidos y si no, devuelve el valor por defecto. */
  leer<T extends string>(clave: string, permitidos: readonly T[], porDefecto: T): T {
    // try/catch porque localStorage puede lanzar error si el navegador lo bloquea
    try {
      const valor = localStorage.getItem(this.PREFIJO + clave);
      // Se valida contra la lista permitida por si el valor guardado es inválido o fue modificado
      return permitidos.find((p) => p === valor) ?? porDefecto;
    } catch {
      return porDefecto;
    }
  }

  /** Guarda una preferencia en localStorage; si no se puede, se ignora sin romper la app. */
  guardar(clave: string, valor: string): void {
    try {
      localStorage.setItem(this.PREFIJO + clave, valor);
    } catch {
      // Sin almacenamiento disponible la preferencia dura solo mientras la página está abierta
    }
  }
}
