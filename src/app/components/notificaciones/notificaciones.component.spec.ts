import { TestBed } from '@angular/core/testing';

import { NotificacionesService } from '../../core/services/notificaciones.service';
import { NotificacionesComponent } from './notificaciones.component';

/**
 * Pruebas del componente que dibuja los avisos (toasts) en pantalla.
 * El componente lee la lista de avisos del NotificacionesService y la pinta.
 */
describe('NotificacionesComponent', () => {
  // Escenario: hay dos avisos de distinto tipo.
  // Esperado: se dibujan dos toasts con la clase de color de su tipo y la X cierra el que se pulsa.
  it('pinta cada aviso como toast con el color de su tipo y lo cierra con la X', () => {
    // Preparar: TestBed arma un módulo de pruebas con el componente standalone
    TestBed.configureTestingModule({ imports: [NotificacionesComponent] });
    // inject devuelve la misma instancia del servicio que usa el componente
    const servicio = TestBed.inject(NotificacionesService);
    // createComponent crea el componente; el fixture da acceso a su HTML
    const fixture = TestBed.createComponent(NotificacionesComponent);
    const html: HTMLElement = fixture.nativeElement;

    // Actuar: se publican dos avisos desde el servicio
    servicio.exito('Proceso creado');
    servicio.error('Sin conexión');
    // detectChanges obliga a Angular a actualizar la vista con los nuevos datos
    fixture.detectChanges();

    // Comprobar: dos toasts, el primero verde (exito) y el segundo rojo (error)
    const toasts = html.querySelectorAll('.notificacion');
    expect(toasts.length).toBe(2);
    expect(toasts[0].classList).toContain('text-bg-success');
    expect(toasts[1].classList).toContain('text-bg-danger');
    expect(toasts[0].textContent).toContain('Proceso creado');

    // Actuar: se pulsa la X del primer toast y se vuelve a renderizar
    html.querySelector<HTMLButtonElement>('.notificacion .btn-close')?.click();
    fixture.detectChanges();
    // Comprobar: solo queda un aviso
    expect(html.querySelectorAll('.notificacion').length).toBe(1);
  });
});
