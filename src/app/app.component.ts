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

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, PiePaginaComponent, NotificacionesComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  readonly sesion = inject(SesionStore);
  readonly carga = inject(CargaService);
  private readonly authService = inject(AuthService);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );

  /**
   * La página pública va de borde a borde; el editor usa todo el ancho para el lienzo; el resto
   * va en un container que no crece sin límite en pantallas muy anchas.
   */
  claseContenido = computed(() => {
    const url = this.url().split('?')[0];
    if (url === '/') {
      return '';
    }
    return /\/procesos\/\d+\/diagrama$/.test(url) ? 'container-fluid py-4 px-3 px-lg-4' : 'container-xxl py-4';
  });

  ngOnInit(): void {
    // Al recargar, se refresca el usuario del token por si un administrador cambió su rol.
    // Si el token venció, el interceptor recibe el 401 y cierra la sesión.
    if (this.sesion.autenticado()) {
      this.authService.yo().subscribe({
        next: (usuario) => this.sesion.actualizarUsuario(usuario),
        error: () => undefined,
      });
    }

    // Cerrar la sesión en una pestaña la cierra en todas
    window.addEventListener('storage', (e) => {
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
        finalize(() => {
          this.sesion.cerrar();
          this.notificaciones.info('Sesión cerrada. ¡Hasta pronto!');
          this.router.navigate(['/login']);
        }),
      )
      .subscribe({ error: () => undefined });
  }
}
