import { Component } from '@angular/core';

/** Pie de página común: qué hace el sistema y qué historias de usuario cubre. */
@Component({
  selector: 'app-pie-pagina',
  templateUrl: './pie-pagina.component.html',
})
export class PiePaginaComponent {
  readonly anio = new Date().getFullYear();
  readonly bloques = [
    'HU-01 a HU-03 · Empresas y usuarios',
    'HU-04 a HU-07 · Procesos',
    'HU-08 a HU-16 · Modelado del flujo',
    'HU-17 a HU-24 · Roles, pools y lanes',
    'HU-25 a HU-28 · Mensajes entre pools',
  ];
}
