import { Component, computed, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { UsuarioResumen } from '../../models/usuario.model';

interface EnlaceMenu {
  id: string;
  ruta: string;
  texto: string;
  icono: string;
}

/**
 * Barra de navegación: el padre le pasa el usuario y recibe el aviso de cerrar sesión. El menú colapsa
 * en pantallas pequeñas (plugin Collapse) y el usuario tiene un menú desplegable (plugin Dropdown).
 */
@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  usuario = input<UsuarioResumen | null>(null);
  cerrarSesion = output<void>();

  readonly enlaces: EnlaceMenu[] = [
    { id: 'navInicio', ruta: '/inicio', texto: 'Inicio', icono: 'bi-house-door' },
    { id: 'navProcesos', ruta: '/procesos', texto: 'Procesos', icono: 'bi-diagram-3' },
    { id: 'navCompartidos', ruta: '/compartidos', texto: 'Compartidos conmigo', icono: 'bi-share' },
    { id: 'navRoles', ruta: '/roles', texto: 'Roles de proceso', icono: 'bi-person-workspace' },
    { id: 'navUsuarios', ruta: '/usuarios', texto: 'Usuarios', icono: 'bi-people' },
  ];

  /** Iniciales para el avatar: primera letra de las dos primeras palabras del nombre. */
  iniciales = computed(() =>
    (this.usuario()?.nombre ?? '')
      .split(' ')
      .filter((parte) => parte.length > 0)
      .slice(0, 2)
      .map((parte) => parte[0].toUpperCase())
      .join(''),
  );
}
