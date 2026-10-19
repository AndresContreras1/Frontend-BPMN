import { Component, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { UsuarioResumen } from '../../models/usuario.model';

/** Barra de navegación: el padre le pasa el usuario y recibe el aviso de cerrar sesión. */
@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  usuario = input<UsuarioResumen | null>(null);
  cerrarSesion = output<void>();
  menuAbierto = false;
}
