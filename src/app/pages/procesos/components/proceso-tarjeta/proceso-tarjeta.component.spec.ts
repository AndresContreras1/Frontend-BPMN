import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Proceso } from '../../../../models/proceso.model';
import { ProcesoTarjetaComponent } from './proceso-tarjeta.component';

describe('ProcesoTarjetaComponent', () => {
  let fixture: ComponentFixture<ProcesoTarjetaComponent>;
  let html: HTMLElement;

  const compras: Proceso = {
    id: 7, nombre: 'Aprobación de compras', descripcion: null, categoria: 'Compras', estado: 'BORRADOR', activo: true,
    version: 0, propio: true, creadoEn: '2026-10-01T10:00:00Z', creadoPor: 'a@a.com',
    modificadoEn: '2026-10-02T10:00:00Z', modificadoPor: 'b@a.com',
  };

  const crear = (puedeEditar: boolean, puedeEliminar: boolean) => {
    TestBed.configureTestingModule({ imports: [ProcesoTarjetaComponent], providers: [provideRouter([])] });
    fixture = TestBed.createComponent(ProcesoTarjetaComponent);
    fixture.componentRef.setInput('proceso', compras);
    fixture.componentRef.setInput('puedeEditar', puedeEditar);
    fixture.componentRef.setInput('puedeEliminar', puedeEliminar);
    fixture.detectChanges();
    html = fixture.nativeElement;
  };

  it('muestra el proceso con su estado, su categoría y quién lo modificó', () => {
    crear(false, false);

    expect(html.querySelector('.nombre-proceso')?.getAttribute('href')).toBe('/procesos/7');
    expect(html.textContent).toContain('Borrador');
    expect(html.textContent).toContain('Compras');
    expect(html.textContent).toContain('Sin descripción.');
    expect(html.textContent).toContain('b@a.com');
    expect(html.querySelector('.acciones')).toBeNull();
  });

  it('los botones dependen de los permisos que decide la página y eliminar sube al padre', () => {
    crear(true, true);
    const eliminados: Proceso[] = [];
    fixture.componentInstance.eliminar.subscribe((p) => eliminados.push(p));

    expect(html.querySelector('#editarProcesoBtn-7')?.getAttribute('href')).toBe('/procesos/editar/7');
    html.querySelector<HTMLButtonElement>('#eliminarProcesoBtn-7')?.click();
    expect(eliminados.map((p) => p.id)).toEqual([7]);
  });
});
