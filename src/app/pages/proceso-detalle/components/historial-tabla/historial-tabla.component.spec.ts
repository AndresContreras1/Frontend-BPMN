import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { HistorialTablaComponent } from './historial-tabla.component';

describe('HistorialTablaComponent (HU-07)', () => {
  it('muestra quién, cuándo y qué cambió, y recarga cuando el padre lo pide', () => {
    TestBed.configureTestingModule({
      imports: [HistorialTablaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const backend = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(HistorialTablaComponent);
    fixture.componentRef.setInput('procesoId', 5);
    fixture.detectChanges();

    const req = backend.expectOne((r) => r.url === '/api/v1/procesos/5/historial');
    expect(req.request.params.get('page')).toBe('0');
    expect(req.request.params.has('sort')).toBeFalse();
    req.flush({
      content: [{
        id: 2, fecha: '2026-10-19T07:46:33Z', usuario: 'admin@demo.com', tipo: 'COMPARTICION', elemento: 'PROCESO',
        elementoId: 5, detalle: 'Proceso compartido con Comercial Andina', advertencias: ['Aviso de prueba'],
      }],
      page: 0, size: 10, totalElements: 1, totalPages: 1,
    });
    fixture.detectChanges();

    const texto = fixture.nativeElement.textContent;
    expect(texto).toContain('Compartición');
    expect(texto).toContain('admin@demo.com');
    expect(texto).toContain('Proceso compartido con Comercial Andina');
    expect(texto).toContain('Aviso de prueba');

    fixture.componentRef.setInput('recarga', 1);
    fixture.detectChanges();
    backend.expectOne((r) => r.url === '/api/v1/procesos/5/historial').flush({ content: [], page: 0, size: 10, totalElements: 0, totalPages: 0 });
    backend.verify();
  });
});
