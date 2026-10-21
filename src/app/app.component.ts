import { Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

import { NavbarComponent } from './components/navbar/navbar.component';
import { SesionStore } from './core/services/sesion.store';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  readonly sesion = inject(SesionStore);
  private readonly router = inject(Router);

  cerrarSesion(): void {
    this.sesion.cerrar();
    this.router.navigate(['/login']);
  }
}
