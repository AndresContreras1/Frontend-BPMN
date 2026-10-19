import { TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, Validators } from '@angular/forms';

import { aplicarErroresDelServidor, limpiarTextos } from '../../core/services/formularios';
import { CampoErrorComponent } from './campo-error.component';

describe('CampoErrorComponent', () => {
  const crear = (control: FormControl, mensajes: Record<string, string> = {}) => {
    const fixture = TestBed.createComponent(CampoErrorComponent);
    fixture.componentRef.setInput('control', control);
    fixture.componentRef.setInput('mensajes', mensajes);
    fixture.detectChanges();
    return fixture;
  };

  it('no muestra nada hasta que el campo se toca', () => {
    const control = new FormControl('', Validators.required);
    const fixture = crear(control);
    expect(fixture.nativeElement.textContent.trim()).toBe('');

    control.markAsTouched();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Este campo es obligatorio');
  });

  it('usa el texto propio del validador y el largo exigido', () => {
    const control = new FormControl('ab', [Validators.minLength(3), Validators.pattern(/^[0-9]+$/)]);
    control.markAsTouched();
    const texto = crear(control, { pattern: 'Solo números' }).nativeElement.textContent;
    expect(texto).toContain('Debe tener al menos 3 caracteres');
    expect(texto).toContain('Solo números');
  });
});

describe('Errores del backend en el formulario', () => {
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

  it('sin errores por campo no asigna nada', () => {
    const form = new FormGroup({ nombre: new FormControl('x') });
    expect(aplicarErroresDelServidor(form, { title: 'Regla', status: 409, detail: 'Duplicado' })).toBeFalse();
  });

  it('limpia los espacios de los textos y deja los demás valores', () => {
    expect(limpiarTextos({ a: '  hola ', b: 3, c: null })).toEqual({ a: 'hola', b: 3, c: null });
  });
});
