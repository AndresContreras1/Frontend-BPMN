import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CompartirPanelComponent } from './compartir-panel.component';

/** Pruebas del panel para compartir un proceso con otras empresas mediante su NIT (HU-23). */
describe('CompartirPanelComponent (HU-23)', () => {
  let fixture: ComponentFixture<CompartirPanelComponent>;
  let backend: HttpTestingController;
  let html: HTMLElement;

  // Ayuda: crea el panel y responde la carga inicial de la compartición (GET) con o sin empresas.
  // "editable" indica si el usuario puede administrar.
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

  // Ayuda: escribe un NIT en el campo (evento "input") y pulsa el botón de agregar
  const agregar = (nit: string) => {
    const input = html.querySelector<HTMLInputElement>('#nuevoNit')!;
    input.value = nit;
    input.dispatchEvent(new Event('input'));
    html.querySelector<HTMLButtonElement>('#agregarNitBtn')!.click();
    fixture.detectChanges();
  };

  // Ayuda: hace clic en el interruptor de compartir (lo activa o lo apaga)
  const activar = () => {
    html.querySelector<HTMLInputElement>('#compartidoSwitch')!.click();
    fixture.detectChanges();
  };

  // verify falla si quedó alguna petición HTTP sin responder
  afterEach(() => backend.verify());

  // Esperado: sin permiso de edición no existe el interruptor y solo se lista con quién se comparte.
  it('quien no administra solo ve con quién está compartido', () => {
    crear(false, true);
    expect(html.querySelector('#compartidoSwitch')).toBeNull();
    expect(html.textContent).toContain('Comercial Andina Ltda. (800987654-3)');
  });

  // Escenario: se intenta agregar un NIT corto y luego el mismo NIT dos veces.
  // Esperado: el inválido muestra error; el repetido se ignora y la lista queda con un solo NIT sin guardar.
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

  // Esperado: activar compartir y guardar sin ningún NIT muestra un aviso y no envía el PUT al servidor.
  it('compartir sin empresas avisa antes de llamar a la API', () => {
    crear(true);
    activar();
    html.querySelector<HTMLButtonElement>('#guardarComparticionBtn')!.click();
    fixture.detectChanges();
    // expectNone comprueba que NO se hizo ninguna petición PUT
    backend.expectNone({ method: 'PUT' });
    expect(html.querySelector('#errorComparticion')!.textContent).toContain('Agregue al menos el NIT');
  });

  // Escenario: se activa, se agrega un NIT y se guarda.
  // Esperado: el PUT lleva el cuerpo correcto, el componente emite "cambio" una vez (para recargar el historial)
  // y muestra el aviso de éxito con la empresa devuelta por el servidor.
  it('guarda la compartición y avisa al padre para recargar el historial', () => {
    crear(true);
    // Contador de veces que el output "cambio" se emite
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

  // Esperado: si ya estaba compartido y se apaga el interruptor, el PUT envía compartido=false y lista vacía.
  it('dejar de compartir envía la lista vacía', () => {
    crear(true, true);
    activar();   // lo apaga
    html.querySelector<HTMLButtonElement>('#guardarComparticionBtn')!.click();
    const req = backend.expectOne({ method: 'PUT', url: '/api/v1/procesos/5/comparticion' });
    expect(req.request.body).toEqual({ compartido: false, nitsEmpresas: [] });
    req.flush({ compartido: false, empresas: [] });
  });

  // Escenario: el servidor responde 404 porque el NIT no corresponde a ninguna empresa.
  // Esperado: el mensaje del servidor se muestra en el panel.
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
