import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { HistorialTablaComponent } from './historial-tabla.component';

/** Pruebas de la tabla de historial de cambios de un proceso (HU-07). */
describe('HistorialTablaComponent (HU-07)', () => {
  // Escenario: el componente carga el historial del proceso 5 y luego el padre pide recargar.
  // Esperado: se muestran usuario, tipo y detalle del cambio; al cambiar "recarga" se hace otra petición.
  it('muestra quién, cuándo y qué cambió, y recarga cuando el padre lo pide', () => {
    // Preparar: HttpClient real pero conectado al backend simulado de pruebas
    TestBed.configureTestingModule({
      imports: [HistorialTablaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    // HttpTestingController permite inspeccionar las peticiones y responderlas a mano
    const backend = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(HistorialTablaComponent);
    fixture.componentRef.setInput('procesoId', 5);
    // Esta primera detección de cambios dispara la petición HTTP
    fixture.detectChanges();

    // expectOne exige que haya exactamente una petición que cumpla la condición
    const req = backend.expectOne((r) => r.url === '/api/v1/procesos/5/historial');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.has('sort')).toBeFalse();
    // flush entrega la respuesta simulada del servidor (página con un registro)
    req.flush({
      content: [{
        id: 2, fecha: '2026-10-19T07:46:33Z', usuario: 'admin@demo.com', tipo: 'COMPARTICION', elemento: 'PROCESO',
        elementoId: 5, detalle: 'Proceso compartido con Comercial Andina', advertencias: ['Aviso de prueba'],
      }],
      page: 0, size: 10, totalElements: 1, totalPages: 1,
    });
    fixture.detectChanges();

    // Comprobar: la tabla muestra los datos recibidos
    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Compartición');
    expect(texto).toContain('admin@demo.com');
    expect(texto).toContain('Proceso compartido con Comercial Andina');
    expect(texto).toContain('Aviso de prueba');

    // Actuar: el padre cambia el input "recarga", lo que debe volver a pedir los datos
    fixture.componentRef.setInput('recarga', 1);
    fixture.detectChanges();
    backend.expectOne((r) => r.url === '/api/v1/procesos/5/historial').flush({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 });
    // verify falla si quedó alguna petición sin atender
    backend.verify();
  });
});
