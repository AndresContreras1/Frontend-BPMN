import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { finalize } from 'rxjs';

import { NavbarComponent } from './components/navbar/navbar.component';
import { SesionStore } from './core/services/sesion.store';
import { AuthService } from './service/auth.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  readonly sesion = inject(SesionStore);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

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
          this.router.navigate(['/login']);
        }),
      )
      .subscribe({ error: () => undefined });
  }
}
