import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Página 404: se muestra cuando la ruta no existe, con un enlace para volver al inicio. */
@Component({
  selector: 'app-no-encontrado',
  imports: [RouterLink],
  templateUrl: './no-encontrado.component.html',
})
export class NoEncontradoComponent {}
