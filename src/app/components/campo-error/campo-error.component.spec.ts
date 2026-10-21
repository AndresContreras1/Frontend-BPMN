import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { aplicarErroresDelServidor, limpiarTextos } from '../../core/services/formularios';
import { CampoErrorComponent } from './campo-error.component';

/** Pruebas del componente que muestra el mensaje de error de un campo de formulario. */
describe('CampoErrorComponent', () => {
  // Ayuda: crea el componente para un control de formulario, con mensajes propios opcionales
  const crear = (control: FormControl, mensajes: Record<string, string> = {}) => {
    const fixture = TestBed.createComponent(CampoErrorComponent);
    // setInput simula los inputs que el formulario padre le pasaría
    fixture.componentRef.setInput('control', control);
    fixture.componentRef.setInput('mensajes', mensajes);
    fixture.detectChanges();
    return fixture;
  };

  // Escenario: un campo obligatorio vacío.
  // Esperado: no muestra nada mientras no se toque; después de tocarlo muestra el mensaje.
  it('no muestra nada hasta que el campo se toca', () => {
    const control = new FormControl('', Validators.required);
    const fixture = crear(control);
    expect(fixture.nativeElement.textContent.trim()).toBe('');

    // markAsTouched simula que el usuario pasó por el campo y salió de él
    control.markAsTouched();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Este campo es obligatorio');
  });

  // Escenario: un campo con dos validadores que fallan (largo mínimo y patrón).
  // Esperado: el mensaje de largo incluye el número exigido y el patrón usa el texto personalizado.
  it('usa el texto propio del validador y el largo exigido', () => {
    const control = new FormControl('ab', [Validators.minLength(3), Validators.pattern(/^[0-9]+$/)]);
    control.markAsTouched();
    const texto = crear(control, { pattern: 'Solo números' }).nativeElement.textContent;
    expect(texto).toContain('Debe tener al menos 3 caracteres');
    expect(texto).toContain('Solo números');
  });
});

/** Pruebas de las ayudas que pasan los errores del backend a los campos del formulario. */
describe('Errores del backend en el formulario', () => {
  // Escenario: el servidor responde con errores por campo, uno de ellos de un campo inexistente.
  // Esperado: el error se asigna al control "nit", se marca tocado y el otro campo queda válido.
  it('asigna cada error a su control y lo marca como tocado', () => {
    const form = new FormGroup({ nombre: new FormControl('x'), nit: new FormControl('1') });
    const asignado = aplicarErroresDelServidor(form, {
      title: 'Datos inválidos', status: 400, detail: '',
      errors: { nit: 'NIT inválido', campoQueNoExiste: 'se ignora' },
    });

    expect(asignado).toBeTrue();
    expect(form.controls.nit.getError('servidor')).toBe('NIT inválido');
    expect(form.controls.nit.touched).toBeTrue();
    expect(form.controls.nombre.valid).toBeTrue();
  });

  // Escenario: el error del servidor es general, sin errores por campo.
  // Esperado: la función devuelve false (no asignó nada).
  it('sin errores por campo no asigna nada', () => {
    const form = new FormGroup({ nombre: new FormControl('x') });
    expect(aplicarErroresDelServidor(form, { title: 'Regla', status: 409, detail: 'Duplicado' })).toBeFalse();
  });

  // Esperado: los textos pierden espacios sobrantes; números y null quedan igual.
  it('limpia los espacios de los textos y deja los demás valores', () => {
    expect(limpiarTextos({ a: '  hola ', b: 3, c: null })).toEqual({ a: 'hola', b: 3, c: null });
  });
});
