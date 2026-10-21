import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';

import { Proceso } from '../../models/proceso.model';
import { ProcesoFormComponent } from './proceso-form.component';

/** Pruebas del formulario para crear (HU-04) y editar (HU-05) un proceso. */
describe('ProcesoFormComponent (HU-04, HU-05)', () => {
  let fixture: ComponentFixture<ProcesoFormComponent>;
  let backend: HttpTestingController;
  let router: Router;
  let html: HTMLElement;

  // Proceso ya guardado en el servidor (versión 3) que se carga al editar
  const existente: Proceso = {
    id: 7, nombre: 'Solicitud de vacaciones', descripcion: 'Radicación y aprobación', categoria: 'Talento humano',
    estado: 'BORRADOR', activo: true, version: 3, propio: true,
    creadoEn: '', creadoPor: '', modificadoEn: '', modificadoPor: '',
  };

  // Ayuda: abre el formulario. Sin id es "crear"; con id es "editar" (el ActivatedRoute falso aporta el parámetro).
  // Siempre responde la petición de categorías que el formulario hace al abrir.
  const crear = (id?: string) => {
    TestBed.configureTestingModule({
      imports: [ProcesoFormComponent],
      providers: [
        provideRouter([]), provideHttpClient(), provideHttpClientTesting(),
        { provide: ActivatedRoute, useValue: { snapshot: { params: id ? { id } : {} } } },
      ],
    });
    fixture = TestBed.createComponent(ProcesoFormComponent);
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    html = fixture.nativeElement;
    fixture.detectChanges();
    backend.expectOne('/api/v1/procesos/categorias').flush(['Talento humano']);
  };

  // Ayuda: simula que el usuario escribe en un campo (eventos "input" y "blur")
  const escribir = (id: string, valor: string) => {
    const campo = html.querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    campo.dispatchEvent(new Event('blur'));
  };

  // Ayuda: pulsa el botón de guardar
  const enviar = () => {
    fixture.detectChanges();
    html.querySelector<HTMLButtonElement>('#guardarProcesoBtn')!.click();
    fixture.detectChanges();
  };

  // verify falla si quedó alguna petición HTTP sin responder
  afterEach(() => backend.verify());

  // Esperado: al crear no hay campo de estado; el nombre se limpia, la descripción vacía va como null
  // y tras guardar se navega al detalle del proceso nuevo.
  it('crear: sin estado (nace en borrador), descripción vacía viaja como null y abre el detalle', () => {
    crear();
    expect(html.querySelector('#estado')).toBeNull();
    escribir('nombre', '  Contratación  ');
    escribir('categoria', 'Talento humano');
    enviar();

    const req = backend.expectOne({ method: 'POST', url: '/api/v1/procesos' });
    expect(req.request.body).toEqual({ nombre: 'Contratación', descripcion: null, categoria: 'Talento humano' });
    req.flush({ ...existente, id: 12 });
    expect(router.navigate).toHaveBeenCalledWith(['/procesos', 12]);
  });

  // Esperado: vacío, el botón está deshabilitado y al salir de los campos aparecen dos mensajes de error; no se envía nada.
  it('crear: exige nombre y categoría (el botón no se habilita sin ellos)', () => {
    crear();
    expect(html.querySelector<HTMLButtonElement>('#guardarProcesoBtn')!.disabled).toBeTrue();
    html.querySelectorAll('input, select, textarea').forEach((c: Element) => c.dispatchEvent(new Event('blur')));
    fixture.detectChanges();
    backend.expectNone({ method: 'POST', url: '/api/v1/procesos' });
    expect(html.querySelectorAll('.invalid-feedback').length).toBe(2);
  });

  // Escenario: el servidor responde 409 (ya existe ese nombre).
  // Esperado: se muestra el motivo y no se navega.
  it('crear: nombre repetido muestra la regla de negocio', () => {
    crear();
    escribir('nombre', 'Solicitud de vacaciones');
    escribir('categoria', 'Talento humano');
    enviar();
    backend.expectOne('/api/v1/procesos').flush(
      { title: 'Regla de negocio', status: 409, detail: "Ya existe un proceso llamado 'Solicitud de vacaciones' en la empresa" },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();
    expect(html.textContent).toContain('Ya existe un proceso llamado');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  // Esperado: el formulario se rellena con el proceso (patchValue asigna valores al formulario) y el PUT
  // envía la versión leída (3), que el servidor usa para detectar ediciones simultáneas.
  it('editar: carga con patchValue y envía la versión leída', () => {
    crear('7');
    backend.expectOne('/api/v1/procesos/7').flush(existente);
    fixture.detectChanges();
    expect(html.querySelector<HTMLInputElement>('#nombre')!.value).toBe('Solicitud de vacaciones');

    escribir('descripcion', 'Nueva descripción');
    enviar();
    const req = backend.expectOne({ method: 'PUT', url: '/api/v1/procesos/7' });
    expect(req.request.body).toEqual({
      nombre: 'Solicitud de vacaciones', descripcion: 'Nueva descripción', categoria: 'Talento humano',
      estado: 'BORRADOR', version: 3,
    });
    req.flush({ ...existente, version: 4 });
    expect(router.navigate).toHaveBeenCalledWith(['/procesos', 7]);
  });

  // Escenario: se cambia el estado a PUBLICADO y el servidor responde 409 con los motivos.
  // Esperado: se muestran todos los motivos de la lista "detalles".
  it('editar: publicar un diagrama incoherente muestra los motivos (409)', () => {
    crear('7');
    backend.expectOne('/api/v1/procesos/7').flush(existente);
    fixture.detectChanges();
    const estado = html.querySelector<HTMLSelectElement>('#estado')!;
    estado.value = 'PUBLICADO';
    estado.dispatchEvent(new Event('change'));
    enviar();

    backend.expectOne({ method: 'PUT', url: '/api/v1/procesos/7' }).flush(
      { title: 'Regla de negocio', status: 409, detail: 'No se puede publicar: el diagrama tiene errores de coherencia',
        detalles: ['El pool no tiene evento de inicio', 'La actividad "Revisar" no tiene salida'] },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();
    expect(html.textContent).toContain('El pool no tiene evento de inicio');
    expect(html.textContent).toContain('La actividad "Revisar" no tiene salida');
  });

  // Escenario: el servidor responde 409 porque otro usuario modificó el proceso antes.
  // Esperado: se muestra el mensaje de conflicto de edición.
  it('editar: otro usuario guardó antes (conflicto de versión)', () => {
    crear('7');
    backend.expectOne('/api/v1/procesos/7').flush(existente);
    fixture.detectChanges();
    enviar();
    backend.expectOne({ method: 'PUT', url: '/api/v1/procesos/7' }).flush(
      { title: 'Conflicto de edición', status: 409, detail: 'Otro usuario modificó el registro. Recargue e intente de nuevo.' },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();
    expect(html.textContent).toContain('Otro usuario modificó el registro');
  });

  // Esperado: si propio=false se muestra un aviso de solo lectura y los campos y el botón quedan deshabilitados.
  it('editar: un proceso compartido por otra empresa queda bloqueado', () => {
    crear('7');
    backend.expectOne('/api/v1/procesos/7').flush({ ...existente, propio: false });
    fixture.detectChanges();
    expect(html.querySelector('#procesoSoloLecturaMsg')).not.toBeNull();
    expect(html.querySelector<HTMLInputElement>('#nombre')!.disabled).toBeTrue();
    expect(html.querySelector<HTMLButtonElement>('#guardarProcesoBtn')!.disabled).toBeTrue();
  });

  // Esperado: ante un 404 se muestra el mensaje del servidor.
  it('editar: un proceso que no existe muestra el 404', () => {
    crear('99');
    backend.expectOne('/api/v1/procesos/99').flush(
      { title: 'Recurso no encontrado', status: 404, detail: 'No existe el proceso 99' },
      { status: 404, statusText: 'Not Found' },
    );
    fixture.detectChanges();
    expect(html.textContent).toContain('No existe el proceso 99');
  });
});
