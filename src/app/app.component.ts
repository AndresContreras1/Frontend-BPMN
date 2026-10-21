import { Component, computed, inject, OnInit } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter, finalize, map } from 'rxjs';

import { NavbarComponent } from './components/navbar/navbar.component';
import { NotificacionesComponent } from './components/notificaciones/notificaciones.component';
import { PiePaginaComponent } from './components/pie-pagina/pie-pagina.component';
import { CargaService } from './core/services/carga.service';
import { NotificacionesService } from './core/services/notificaciones.service';
import { SesionStore } from './core/services/sesion.store';
import { AuthService } from './service/auth.service';

/** Componente raíz: dibuja la navbar, el contenido de la página actual, el pie y los avisos. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, PiePaginaComponent, NotificacionesComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  /** Estado de la sesión (usuario y rol); lo usa la plantilla para la navbar. */
  readonly sesion = inject(SesionStore);
  /** Estado de la carga global; la plantilla muestra la barra mientras esté cargando. */
  readonly carga = inject(CargaService);
  /** Servicio con las peticiones de login, logout y consulta del usuario. */
  private readonly authService = inject(AuthService);
  /** Servicio para mostrar avisos al usuario. */
  private readonly notificaciones = inject(NotificacionesService);
  /** Router, para navegar y conocer la URL actual. */
  private readonly router = inject(Router);

  /** URL actual como signal: se actualiza cada vez que termina una navegación. */
  private readonly url = toSignal(
    this.router.events.pipe(
      // Solo interesa el evento de fin de navegación
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      // urlAfterRedirects es la URL final, ya con las redirecciones aplicadas
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /**
   * La página pública va de borde a borde; el editor usa todo el ancho para el lienzo; el resto
   * va en un container que no crece sin límite en pantallas muy anchas.
   */
  claseContenido = computed(() => {
    // Se quita el query string para comparar solo la ruta
    const url = this.url().split('?')[0];
    // Bienvenida: sin container
    if (url === '/') {
      return '';
    }
    // Editor del diagrama (/procesos/<id>/diagrama): ancho completo; las demás páginas: container limitado
    return /\/procesos\/\d+\/diagrama$/.test(url) ? 'container-fluid py-4 px-3 px-lg-4' : 'container-xxl py-4';
  });

  /** Al arrancar la app: refresca el usuario y escucha el cierre de sesión en otras pestañas. */
  ngOnInit(): void {
    // Al recargar, se refresca el usuario del token por si un administrador cambió su rol.
    // Si el token venció, el interceptor recibe el 401 y cierra la sesión.
    if (this.sesion.autenticado()) {
      this.authService.yo().subscribe({
        next: (usuario) => this.sesion.actualizarUsuario(usuario),
        // Un fallo aquí se ignora: el interceptor ya se encarga del 401
        error: () => undefined,
      });
    }

    // Cerrar la sesión en una pestaña la cierra en todas
    // (el evento storage se dispara en las otras pestañas cuando cambia el localStorage)
    window.addEventListener('storage', (e) => {
      // Se borró el token: esta pestaña también limpia su sesión y va al login
      if (e.key === 'token' && e.newValue === null) {
        this.sesion.cerrar();
        this.router.navigate(['/login']);
      }
    });
  }

  /** HU-03: cierre de sesión. Se avisa a la API y, responda o no, se borra el token local. */
  cerrarSesion(): void {
    this.authService
      .logout()
      .pipe(
        // finalize corre al terminar la petición, con éxito o con error
        finalize(() => {
          // Se limpia la sesión local, se avisa al usuario y se vuelve al login
          this.sesion.cerrar();
          this.notificaciones.info('Sesión cerrada. ¡Hasta pronto!');
          this.router.navigate(['/login']);
        }),
      )
      .subscribe({ error: () => undefined });
  }
}
