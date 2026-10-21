import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Lane } from '../../../models/lane.model';
import { Pool, PoolRequest } from '../../../models/pool.model';
import { EstructuraPanelComponent, MovimientoLane } from './estructura-panel/estructura-panel.component';
import { LaneFormComponent } from './lane-form/lane-form.component';
import { PoolFormComponent } from './pool-form/pool-form.component';

// Ayuda: crea una lane de ejemplo del pool 1
const lane = (id: number, nombre: string, orden: number, rolProcesoId = id): Lane => ({ id, poolId: 1, rolProcesoId, nombre, orden });
// Pool propietario con dos lanes en desorden (Jefe primero) para probar el orden
const propietario: Pool = {
  id: 1, procesoId: 9, nombre: 'Facimus', tipo: 'PROPIETARIO', cajaNegra: false, orden: 0,
  permisoEstructura: 'ADMINISTRADOR_Y_EDITOR', lanes: [lane(11, 'Jefe', 1, 2), lane(10, 'Empleado', 0, 1)],
};
// Pool de sistema externo en caja negra (sin lanes)
const correo: Pool = {
  id: 2, procesoId: 9, nombre: 'Servicio de correo', tipo: 'SISTEMA_EXTERNO', cajaNegra: true, orden: 1,
  permisoEstructura: 'ADMINISTRADOR_Y_EDITOR', lanes: [],
};

/** Pruebas del formulario para crear o editar un pool (HU-21, HU-24). */
describe('PoolFormComponent (HU-21, HU-24)', () => {
  // Ayuda: crea el formulario; pool=null es "nuevo pool". Los inputs se pasan con setInput como lo haría el padre.
  const crear = (pool: Pool | null, esAdministrador = false) => {
    const fixture = TestBed.createComponent(PoolFormComponent);
    fixture.componentRef.setInput('pool', pool);
    fixture.componentRef.setInput('esAdministrador', esAdministrador);
    fixture.detectChanges();
    return fixture;
  };

  // Esperado: al elegir el tipo "sistema externo" la casilla de caja negra se marca y se bloquea;
  // con otro tipo vuelve a poder cambiarse.
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

  // Esperado: al guardar, el output "guardar" emite el pool con el nombre sin espacios sobrantes.
  it('emite el pool nuevo con el nombre limpio', () => {
    const fixture = crear(null);
    const html: HTMLElement = fixture.nativeElement;
    // Aquí se guarda lo que emite el output
    let emitido: PoolRequest | undefined;
    fixture.componentInstance.guardar.subscribe((p) => (emitido = p));
    const nombre = html.querySelector<HTMLInputElement>('#poolNombre')!;
    nombre.value = '  Cliente final ';
    nombre.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#guardarPoolBtn')!.click();
    expect(emitido).toEqual({ nombre: 'Cliente final', tipo: 'CLIENTE', cajaNegra: false });
  });

  // Esperado: sin nombre el botón está deshabilitado, no se emite nada y, al salir de los campos, se indica que falta.
  it('sin nombre el botón no se habilita y al tocar el campo dice qué falta', () => {
    const fixture = crear(null);
    let emitidos = 0;
    fixture.componentInstance.guardar.subscribe(() => emitidos++);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#guardarPoolBtn').disabled).toBeTrue();
    fixture.nativeElement.querySelectorAll('input, select, textarea').forEach((c: Element) => c.dispatchEvent(new Event('blur')));
    fixture.detectChanges();
    expect(emitidos).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('Este campo es obligatorio');
  });

  // Esperado: en el pool propietario el tipo y la caja negra están bloqueados; el administrador puede
  // cambiar el permiso de estructura y el componente emite el valor elegido al aplicar.
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

  // Esperado: un editor ve el permiso como texto, sin el select para cambiarlo.
  it('el editor ve el permiso, pero no lo cambia', () => {
    const fixture = crear(propietario, false);
    expect(fixture.nativeElement.querySelector('#permisoEstructura')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Administrador y editor');
  });
});

/** Pruebas del formulario para crear o cambiar el rol de una lane (HU-22). */
describe('LaneFormComponent (HU-22)', () => {
  // Catálogo de roles de proceso disponibles
  const roles = [{ id: 1, nombre: 'Empleado' }, { id: 2, nombre: 'Jefe' }, { id: 3, nombre: 'Talento humano' }];

  // Ayuda: crea el formulario para el pool propietario; laneEditada=null es una lane nueva
  const crear = (laneEditada: Lane | null, catalogo = roles) => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(LaneFormComponent);
    fixture.componentRef.setInput('pool', propietario);
    fixture.componentRef.setInput('lane', laneEditada);
    fixture.componentRef.setInput('roles', catalogo);
    fixture.detectChanges();
    return fixture;
  };

  // Esperado: el pool ya usa Empleado y Jefe, así que solo queda disponible "Talento humano".
  it('para una lane nueva solo ofrece roles que el pool aún no usa', () => {
    const fixture = crear(null);
    expect(fixture.componentInstance.rolesDisponibles().map((r) => r.nombre)).toEqual(['Talento humano']);
  });

  // Esperado: al editar la lane Empleado se ofrece su rol actual además de los libres, y viene preseleccionado.
  it('al cambiar el rol de una lane también ofrece el rol actual', () => {
    const fixture = crear(propietario.lanes[1]);
    expect(fixture.componentInstance.rolesDisponibles().map((r) => r.nombre)).toEqual(['Empleado', 'Talento humano']);
    expect(fixture.componentInstance.laneForm.controls.rolProcesoId.value).toBe(1);
  });

  // Esperado: sin elegir rol el botón está deshabilitado y se pide elegirlo; con un rol (setValue asigna el valor
  // del control) el botón emite su id.
  it('emite el id del rol elegido y exige elegir uno', () => {
    const fixture = crear(null);
    const html: HTMLElement = fixture.nativeElement;
    const emitidos: number[] = [];
    fixture.componentInstance.guardar.subscribe((id) => emitidos.push(id));
    fixture.detectChanges();
    expect(html.querySelector<HTMLButtonElement>('#guardarLaneBtn')!.disabled).toBeTrue();
    html.querySelectorAll('input, select, textarea').forEach((c: Element) => c.dispatchEvent(new Event('blur')));
    fixture.detectChanges();
    expect(html.textContent).toContain('Elija el rol responsable de la lane');

    fixture.componentInstance.laneForm.controls.rolProcesoId.setValue(3);
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#guardarLaneBtn')!.click();
    expect(emitidos).toEqual([3]);
  });

  // Esperado: si todos los roles del catálogo ya están en uso se muestra un aviso y el botón queda deshabilitado.
  it('sin roles libres avisa y no deja guardar', () => {
    const fixture = crear(null, roles.slice(0, 2));
    expect(fixture.nativeElement.querySelector('#sinRolesMsg')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('#guardarLaneBtn').disabled).toBeTrue();
  });
});

/** Pruebas del panel que lista los pools y sus lanes con las acciones para modificarlos. */
describe('EstructuraPanelComponent', () => {
  // Ayuda: crea el panel con los dos pools de ejemplo; "editable" indica si el usuario puede modificar la estructura
  const crear = (editable: boolean) => {
    const fixture = TestBed.createComponent(EstructuraPanelComponent);
    fixture.componentRef.setInput('pools', [propietario, correo]);
    fixture.componentRef.setInput('editable', editable);
    fixture.detectChanges();
    return fixture;
  };

  // Esperado: las lanes se listan por su orden; "Subir" de la primera y "Bajar" de la última están deshabilitados.
  it('ordena las lanes y no deja subir la primera ni bajar la última', () => {
    const html: HTMLElement = crear(true).nativeElement;
    const lanes = [...html.querySelectorAll('.list-group-item')].map((li) => li.textContent!.trim());
    expect(lanes[0]).toContain('Empleado');
    expect(lanes[1]).toContain('Jefe');
    expect(html.querySelector<HTMLButtonElement>('button[aria-label="Subir Empleado"]')!.disabled).toBeTrue();
    expect(html.querySelector<HTMLButtonElement>('button[aria-label="Bajar Jefe"]')!.disabled).toBeTrue();
  });

  // Esperado: el pool de caja negra no permite agregar lanes y el pool propietario no tiene botón de eliminar.
  it('la caja negra no ofrece lanes y el pool propietario no se elimina', () => {
    const html: HTMLElement = crear(true).nativeElement;
    expect(html.querySelector('#agregarLaneBtn-2')).toBeNull();
    expect(html.querySelector('#eliminarPoolBtn-1')).toBeNull();
    expect(html.querySelector('#eliminarPoolBtn-2')).not.toBeNull();
    expect(html.textContent).toContain('Caja negra');
  });

  // Esperado: los botones emiten al padre el movimiento de la lane (con su dirección) y lo que se debe abrir
  // en el formulario (una lane nueva en el pool 1 y un pool nuevo).
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

  // Esperado: con editable=false el panel no tiene ningún botón.
  it('sin permiso de estructura no muestra acciones', () => {
    const html: HTMLElement = crear(false).nativeElement;
    expect(html.querySelectorAll('button').length).toBe(0);
  });
});
