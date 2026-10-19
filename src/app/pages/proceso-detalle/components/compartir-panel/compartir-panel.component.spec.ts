import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompartirPanelComponent } from './compartir-panel.component';

describe('CompartirPanelComponent (HU-23)', () => {
  let fixture: ComponentFixture<CompartirPanelComponent>;
  let backend: HttpTestingController;
  let html: HTMLElement;

  const crear = (editable: boolean, compartido = false) => {
    TestBed.configureTestingModule({
      imports: [CompartirPanelComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CompartirPanelComponent);
    fixture.componentRef.setInput('procesoId', 5);
    fixture.componentRef.setInput('editable', editable);
    html = fixture.nativeElement;
    fixture.detectChanges();
    backend.expectOne('/api/v1/procesos/5/comparticion').flush(
      compartido ? { compartido: true, empresas: [{ nombre: 'Comercial Andina Ltda.', nit: '800987654-3' }] } : { compartido: false, empresas: [] },
    );
    fixture.detectChanges();
  };

  const agregar = (nit: string) => {
    const input = html.querySelector<HTMLInputElement>('#nuevoNit')!;
    input.value = nit;
    input.dispatchEvent(new Event('input'));
    html.querySelector<HTMLButtonElement>('#agregarNitBtn')!.click();
    fixture.detectChanges();
  };

  const activar = () => {
    html.querySelector<HTMLInputElement>('#compartidoSwitch')!.click();
    fixture.detectChanges();
  };

  afterEach(() => backend.verify());

  it('quien no administra solo ve con quién está compartido', () => {
    crear(false, true);
    expect(html.querySelector('#compartidoSwitch')).toBeNull();
    expect(html.textContent).toContain('Comercial Andina Ltda. (800987654-3)');
  });

  it('no agrega NIT con formato inválido ni repetidos', () => {
    crear(true);
    activar();
    agregar('12');
    expect(html.textContent).toContain('NIT inválido');
    agregar('800987654-3');
    agregar('800987654-3');
    expect(fixture.componentInstance.nits()).toEqual(['800987654-3']);
    expect(html.querySelector('#nitsCompartidos')!.textContent).toContain('sin guardar');
  });

  it('compartir sin empresas avisa antes de llamar a la API', () => {
    crear(true);
    activar();
    html.querySelector<HTMLButtonElement>('#guardarComparticionBtn')!.click();
    fixture.detectChanges();
    backend.expectNone({ method: 'PUT' });
    expect(html.querySelector('#errorComparticion')!.textContent).toContain('Agregue al menos el NIT');
  });

  it('guarda la compartición y avisa al padre para recargar el historial', () => {
    crear(true);
    let avisos = 0;
    fixture.componentInstance.cambio.subscribe(() => avisos++);
    activar();
    agregar('800987654-3');
    html.querySelector<HTMLButtonElement>('#guardarComparticionBtn')!.click();

    const req = backend.expectOne({ method: 'PUT', url: '/api/v1/procesos/5/comparticion' });
    expect(req.request.body).toEqual({ compartido: true, nitsEmpresas: ['800987654-3'] });
    req.flush({ compartido: true, empresas: [{ nombre: 'Comercial Andina Ltda.', nit: '800987654-3' }] });
    fixture.detectChanges();

    expect(avisos).toBe(1);
    expect(html.querySelector('#avisoComparticion')!.textContent).toContain('compartido en solo lectura');
    expect(html.querySelector('#nitsCompartidos')!.textContent).toContain('Comercial Andina Ltda.');
  });

  it('dejar de compartir envía la lista vacía', () => {
    crear(true, true);
    activar();   // lo apaga
    html.querySelector<HTMLButtonElement>('#guardarComparticionBtn')!.click();
    const req = backend.expectOne({ method: 'PUT', url: '/api/v1/procesos/5/comparticion' });
    expect(req.request.body).toEqual({ compartido: false, nitsEmpresas: [] });
    req.flush({ compartido: false, empresas: [] });
  });

  it('muestra el error de la API (NIT sin empresa registrada)', () => {
    crear(true);
    activar();
    agregar('111111111-1');
    html.querySelector<HTMLButtonElement>('#guardarComparticionBtn')!.click();
    backend.expectOne({ method: 'PUT', url: '/api/v1/procesos/5/comparticion' }).flush(
      { title: 'Recurso no encontrado', status: 404, detail: 'No existe una empresa registrada con el NIT 111111111-1' },
      { status: 404, statusText: 'Not Found' },
    );
    fixture.detectChanges();
    expect(html.querySelector('#errorComparticion')!.textContent).toContain('111111111-1');
  });
});
