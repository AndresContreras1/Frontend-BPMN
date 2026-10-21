import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Proceso } from '../../../../models/proceso.model';
import { ProcesoTarjetaComponent } from './proceso-tarjeta.component';

/** Pruebas de la tarjeta que representa un proceso en la vista de tarjetas. */
describe('ProcesoTarjetaComponent', () => {
  let fixture: ComponentFixture<ProcesoTarjetaComponent>;
  let html: HTMLElement;

  // Proceso de ejemplo en borrador
  const compras: Proceso = {
    id: 7, nombre: 'Aprobación de compras', descripcion: null, categoria: 'Compras', estado: 'BORRADOR', activo: true,
    version: 0, propio: true, creadoEn: '2026-10-01T10:00:00Z', creadoPor: 'a@a.com',
    modificadoEn: '2026-10-02T10:00:00Z', modificadoPor: 'b@a.com',
  };

  // Ayuda: crea la tarjeta pasando el proceso y los permisos como inputs (la página padre decide los permisos)
  const crear = (puedeEditar: boolean, puedeEliminar: boolean) => {
    TestBed.configureTestingModule({ imports: [ProcesoTarjetaComponent], providers: [provideRouter([])] });
    fixture = TestBed.createComponent(ProcesoTarjetaComponent);
    fixture.componentRef.setInput('proceso', compras);
    fixture.componentRef.setInput('puedeEditar', puedeEditar);
    fixture.componentRef.setInput('puedeEliminar', puedeEliminar);
    fixture.detectChanges();
    html = fixture.nativeElement;
  };

  // Esperado: sin permisos se ven nombre (enlace al detalle), estado, categoría y último modificador, y no hay botones.
  it('muestra el proceso con su estado, su categoría y quién lo modificó', () => {
    crear(false, false);

    expect(html.querySelector('.nombre-proceso')?.getAttribute('href')).toBe('/procesos/7');
    expect(html.textContent).toContain('Borrador');
    expect(html.textContent).toContain('Compras');
    expect(html.textContent).toContain('Sin descripción.');
    expect(html.textContent).toContain('b@a.com');
    expect(html.querySelector('.acciones')).toBeNull();
  });

  // Esperado: con permisos aparecen editar (enlace) y eliminar; al pulsar eliminar se emite el proceso al padre.
  it('los botones dependen de los permisos que decide la página y eliminar sube al padre', () => {
    crear(true, true);
    // Lista donde se guarda lo que emite el output "eliminar"
    const eliminados: Proceso[] = [];
    fixture.componentInstance.eliminar.subscribe((p) => eliminados.push(p));

    expect(html.querySelector('#editarProcesoBtn-7')?.getAttribute('href')).toBe('/procesos/editar/7');
    html.querySelector<HTMLButtonElement>('#eliminarProcesoBtn-7')?.click();
    expect(eliminados.map((p) => p.id)).toEqual([7]);
  });
});
