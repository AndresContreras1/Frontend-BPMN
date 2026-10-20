import { TestBed } from '@angular/core/testing';

import { NotificacionesService } from '../../core/services/notificaciones.service';
import { NotificacionesComponent } from './notificaciones.component';

describe('NotificacionesComponent', () => {
  it('pinta cada aviso como toast con el color de su tipo y lo cierra con la X', () => {
    TestBed.configureTestingModule({ imports: [NotificacionesComponent] });
    const servicio = TestBed.inject(NotificacionesService);
    const fixture = TestBed.createComponent(NotificacionesComponent);
    const html: HTMLElement = fixture.nativeElement;

    servicio.exito('Proceso creado');
    servicio.error('Sin conexión');
    fixture.detectChanges();

    const toasts = html.querySelectorAll('.notificacion');
    expect(toasts.length).toBe(2);
    expect(toasts[0].classList).toContain('text-bg-success');
    expect(toasts[1].classList).toContain('text-bg-danger');
    expect(toasts[0].textContent).toContain('Proceso creado');

    html.querySelector<HTMLButtonElement>('.notificacion .btn-close')?.click();
    fixture.detectChanges();
    expect(html.querySelectorAll('.notificacion').length).toBe(1);
  });
});
