import { Component, input } from '@angular/core';

/** Título y subtítulo de cada página. */
@Component({
  selector: 'app-page-title',
  templateUrl: './page-title.component.html',
})
export class PageTitleComponent {
  titulo = input.required<string>();
  subtitulo = input<string>();
  /** Historias de usuario que cubre la pantalla (por ejemplo "HU-04 a HU-07"). */
  hu = input<string>();
}
