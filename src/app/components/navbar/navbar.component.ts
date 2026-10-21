import { Component, computed, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { UsuarioResumen } from '../../models/usuario.model';

/** Datos de un enlace del menú principal. */
interface EnlaceMenu {
  /** Id del HTML, útil para las pruebas. */
  id: string;
  /** Ruta de Angular a la que lleva. */
  ruta: string;
  /** Texto visible. */
  texto: string;
  /** Clase del ícono de Bootstrap Icons. */
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
  /** Usuario con sesión iniciada; null si nadie inició sesión (se muestran los enlaces públicos). */
  usuario = input<UsuarioResumen | null>(null);
  /** Se emite al pulsar "Cerrar sesión"; el padre se encarga de cerrarla. */
  cerrarSesion = output<void>();

  /** Enlaces del menú para el usuario con sesión; el template los recorre con @for. */
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
      // Separamos el nombre por espacios
      .split(' ')
      // Quitamos textos vacíos (por si hay espacios dobles)
      .filter((parte) => parte.length > 0)
      // Nos quedamos con las dos primeras palabras
      .slice(0, 2)
      // Primera letra de cada palabra, en mayúscula
      .map((parte) => parte[0].toUpperCase())
      // Las unimos: "Ana Pérez" queda "AP"
      .join(''),
  );
}
