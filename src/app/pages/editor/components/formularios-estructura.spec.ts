import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Lane } from '../../../models/lane.model';
import { Pool, PoolRequest } from '../../../models/pool.model';
import { EstructuraPanelComponent, MovimientoLane } from './estructura-panel/estructura-panel.component';
import { LaneFormComponent } from './lane-form/lane-form.component';
import { PoolFormComponent } from './pool-form/pool-form.component';

const lane = (id: number, nombre: string, orden: number, rolProcesoId = id): Lane => ({ id, poolId: 1, rolProcesoId, nombre, orden });
const propietario: Pool = {
  id: 1, procesoId: 9, nombre: 'Facimus', tipo: 'PROPIETARIO', cajaNegra: false, orden: 0,
  permisoEstructura: 'ADMINISTRADOR_Y_EDITOR', lanes: [lane(11, 'Jefe', 1, 2), lane(10, 'Empleado', 0, 1)],
};
const correo: Pool = {
  id: 2, procesoId: 9, nombre: 'Servicio de correo', tipo: 'SISTEMA_EXTERNO', cajaNegra: true, orden: 1,
  permisoEstructura: 'ADMINISTRADOR_Y_EDITOR', lanes: [],
};

describe('PoolFormComponent (HU-21, HU-24)', () => {
  const crear = (pool: Pool | null, esAdministrador = false) => {
    const fixture = TestBed.createComponent(PoolFormComponent);
    fixture.componentRef.setInput('pool', pool);
    fixture.componentRef.setInput('esAdministrador', esAdministrador);
    fixture.detectChanges();
    return fixture;
  };

  it('un sistema externo queda como caja negra fija', () => {
    const fixture = crear(null);
    const html: HTMLElement = fixture.nativeElement;
    const tipo = html.querySelector<HTMLSelectElement>('#poolTipo')!;
    tipo.value = 'SISTEMA_EXTERNO';
    tipo.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(html.querySelector<HTMLInputElement>('#poolCajaNegra')!.checked).toBeTrue();
    expect(html.querySelector<HTMLInputElement>('#poolCajaNegra')!.disabled).toBeTrue();

    tipo.value = 'PROVEEDOR';
    tipo.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(html.querySelector<HTMLInputElement>('#poolCajaNegra')!.disabled).toBeFalse();
  });

  it('emite el pool nuevo con el nombre limpio', () => {
    const fixture = crear(null);
    const html: HTMLElement = fixture.nativeElement;
    let emitido: PoolRequest | undefined;
    fixture.componentInstance.guardar.subscribe((p) => (emitido = p));
    const nombre = html.querySelector<HTMLInputElement>('#poolNombre')!;
    nombre.value = '  Cliente final ';
    nombre.dispatchEvent(new Event('input'));
    html.querySelector<HTMLButtonElement>('#guardarPoolBtn')!.click();
    expect(emitido).toEqual({ nombre: 'Cliente final', tipo: 'CLIENTE', cajaNegra: false });
  });

  it('no emite sin nombre', () => {
    const fixture = crear(null);
    let emitidos = 0;
    fixture.componentInstance.guardar.subscribe(() => emitidos++);
    fixture.nativeElement.querySelector('#guardarPoolBtn').click();
    fixture.detectChanges();
    expect(emitidos).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Este campo es obligatorio');
  });

  it('el pool propietario no cambia de tipo ni es caja negra; el administrador cambia el permiso', () => {
    const fixture = crear(propietario, true);
    const html: HTMLElement = fixture.nativeElement;
    expect(html.querySelector<HTMLSelectElement>('#poolTipo')!.disabled).toBeTrue();
    expect(html.querySelector<HTMLInputElement>('#poolCajaNegra')!.disabled).toBeTrue();

    let permiso: string | undefined;
    fixture.componentInstance.cambiarPermiso.subscribe((p) => (permiso = p));
    const select = html.querySelector<HTMLSelectElement>('#permisoEstructura')!;
    select.value = 'SOLO_ADMINISTRADOR';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#aplicarPermisoBtn')!.click();
    expect(permiso).toBe('SOLO_ADMINISTRADOR');
  });

  it('el editor ve el permiso, pero no lo cambia', () => {
    const fixture = crear(propietario, false);
    expect(fixture.nativeElement.querySelector('#permisoEstructura')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Administrador y editor');
  });
});

describe('LaneFormComponent (HU-22)', () => {
  const roles = [{ id: 1, nombre: 'Empleado' }, { id: 2, nombre: 'Jefe' }, { id: 3, nombre: 'Talento humano' }];

  const crear = (laneEditada: Lane | null, catalogo = roles) => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(LaneFormComponent);
    fixture.componentRef.setInput('pool', propietario);
    fixture.componentRef.setInput('lane', laneEditada);
    fixture.componentRef.setInput('roles', catalogo);
    fixture.detectChanges();
    return fixture;
  };

  it('para una lane nueva solo ofrece roles que el pool aún no usa', () => {
    const fixture = crear(null);
    expect(fixture.componentInstance.rolesDisponibles().map((r) => r.nombre)).toEqual(['Talento humano']);
  });

  it('al cambiar el rol de una lane también ofrece el rol actual', () => {
    const fixture = crear(propietario.lanes[1]);
    expect(fixture.componentInstance.rolesDisponibles().map((r) => r.nombre)).toEqual(['Empleado', 'Talento humano']);
    expect(fixture.componentInstance.laneForm.controls.rolProcesoId.value).toBe(1);
  });

  it('emite el id del rol elegido y exige elegir uno', () => {
    const fixture = crear(null);
    const html: HTMLElement = fixture.nativeElement;
    const emitidos: number[] = [];
    fixture.componentInstance.guardar.subscribe((id) => emitidos.push(id));
    html.querySelector<HTMLButtonElement>('#guardarLaneBtn')!.click();
    fixture.detectChanges();
    expect(html.textContent).toContain('Elija el rol responsable de la lane');

    fixture.componentInstance.laneForm.controls.rolProcesoId.setValue(3);
    html.querySelector<HTMLButtonElement>('#guardarLaneBtn')!.click();
    expect(emitidos).toEqual([3]);
  });

  it('sin roles libres avisa y no deja guardar', () => {
    const fixture = crear(null, roles.slice(0, 2));
    expect(fixture.nativeElement.querySelector('#sinRolesMsg')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#guardarLaneBtn').disabled).toBeTrue();
  });
});

describe('EstructuraPanelComponent', () => {
  const crear = (editable: boolean) => {
    const fixture = TestBed.createComponent(EstructuraPanelComponent);
    fixture.componentRef.setInput('pools', [propietario, correo]);
    fixture.componentRef.setInput('editable', editable);
    fixture.detectChanges();
    return fixture;
  };

  it('ordena las lanes y no deja subir la primera ni bajar la última', () => {
    const html: HTMLElement = crear(true).nativeElement;
    const lanes = [...html.querySelectorAll('.list-group-item')].map((li) => li.textContent!.trim());
    expect(lanes[0]).toContain('Empleado');
    expect(lanes[1]).toContain('Jefe');
    expect(html.querySelector<HTMLButtonElement>('button[aria-label="Subir Empleado"]')!.disabled).toBeTrue();
    expect(html.querySelector<HTMLButtonElement>('button[aria-label="Bajar Jefe"]')!.disabled).toBeTrue();
  });

  it('la caja negra no ofrece lanes y el pool propietario no se elimina', () => {
    const html: HTMLElement = crear(true).nativeElement;
    expect(html.querySelector('#agregarLaneBtn-2')).toBeNull();
    expect(html.querySelector('#eliminarPoolBtn-1')).toBeNull();
    expect(html.querySelector('#eliminarPoolBtn-2')).not.toBeNull();
    expect(html.textContent).toContain('Caja negra');
  });

  it('avisa al padre qué lane mover y qué abrir', () => {
    const fixture = crear(true);
    const movimientos: MovimientoLane[] = [];
    const abiertos: unknown[] = [];
    fixture.componentInstance.moverLane.subscribe((m) => movimientos.push(m));
    fixture.componentInstance.seleccionar.subscribe((s) => abiertos.push(s));
    const html: HTMLElement = fixture.nativeElement;
    html.querySelector<HTMLButtonElement>('button[aria-label="Bajar Empleado"]')!.click();
    html.querySelector<HTMLButtonElement>('#agregarLaneBtn-1')!.click();
    html.querySelector<HTMLButtonElement>('#agregarPoolBtn')!.click();

    expect(movimientos[0].lane.nombre).toBe('Empleado');
    expect(movimientos[0].direccion).toBe(1);
    expect(abiertos).toEqual([{ tipo: 'lane', id: null, poolId: 1 }, { tipo: 'pool', id: null }]);
  });

  it('sin permiso de estructura no muestra acciones', () => {
    const html: HTMLElement = crear(false).nativeElement;
    expect(html.querySelectorAll('button').length).toBe(0);
  });
});
