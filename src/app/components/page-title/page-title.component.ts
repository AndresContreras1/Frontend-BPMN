import { Component, input } from '@angular/core';

/** Título y subtítulo de cada página. */
@Component({
  selector: 'app-page-title',
  templateUrl: './page-title.component.html',
})
export class PageTitleComponent {
  titulo = input.required<string>();
  subtitulo = input<string>();
}
