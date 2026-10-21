import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, EMPTY, finalize, switchMap } from 'rxjs';

import { AlertaErrorComponent } from '../../components/alerta-error/alerta-error.component';
import { CampoErrorComponent } from '../../components/campo-error/campo-error.component';
import { problemaDe } from '../../core/services/errores';
import { aplicarErroresDelServidor, limpiarTextos } from '../../core/services/formularios';
import { NotificacionesService } from '../../core/services/notificaciones.service';
import { SesionStore } from '../../core/services/sesion.store';
import { PATRON_NIT, RegistroEmpresaRequest } from '../../models/empresa.model';
import { ProblemDetail } from '../../models/problem-detail.model';
import { AuthService } from '../../service/auth.service';
import { EmpresaService } from '../../service/empresa.service';

/**
 * HU-01: registro de la empresa. El representante queda como ADMINISTRADOR y entra de una vez
 * con el correo de contacto y la contraseña que eligió.
 */
@Component({
  selector: 'app-registro-empresa',
  imports: [ReactiveFormsModule, RouterLink, AlertaErrorComponent, CampoErrorComponent],
  templateUrl: './registro-empresa.component.html',
})
export class RegistroEmpresaComponent {
  // Servicios y herramientas que usa la pantalla
  // Registra la empresa en la API
  private readonly empresaService = inject(EmpresaService);
  // Inicia sesión después de registrar
  private readonly authService = inject(AuthService);
  // Guarda la sesión (token y usuario)
  private readonly sesion = inject(SesionStore);
  // Muestra el aviso de éxito
  private readonly notificaciones = inject(NotificacionesService);
  // Para cambiar de página
  private readonly router = inject(Router);

  /** true mientras se espera la respuesta; deshabilita el botón. */
  enviando = signal(false);
  /** Error devuelto por la API. */
  problema = signal<ProblemDetail | null>(null);

  /** Formulario reactivo de la empresa y de su administrador, con las mismas reglas que valida el backend. */
  registroForm = new FormGroup({
    // Nombre de la empresa: obligatorio, máximo 120
    nombre: new FormControl('', [Validators.required, Validators.maxLength(120)]),
    // NIT: obligatorio y con el formato de PATRON_NIT
    nit: new FormControl('', [Validators.required, Validators.pattern(PATRON_NIT)]),
    // Correo de contacto: será también el usuario con el que entra el administrador
    correoContacto: new FormControl('', [Validators.required, Validators.email, Validators.maxLength(120)]),
    // Nombre del representante, que queda como administrador
    nombreRepresentante: new FormControl('', [Validators.required, Validators.maxLength(120)]),
    // Contraseña: entre 8 y 72 caracteres (72 es el máximo que admite el cifrado del backend)
    password: new FormControl('', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]),
  });

  /** Texto propio para cuando el NIT no cumple el patrón (se pasa a app-campo-error). */
  mensajesNit = { pattern: 'El NIT debe tener entre 5 y 15 dígitos y, opcional, el dígito de verificación (900123456-1)' };

  /** Se ejecuta al enviar el formulario. */
  handleSubmit(): void {
    // Si hay errores se marcan todos los campos y no se envía nada
    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }
    // Se bloquea el botón y se borra el error anterior
    this.enviando.set(true);
    this.problema.set(null);
    // Valores actuales del formulario
    const v = this.registroForm.value;
    // Se recortan los espacios de los textos y se arma la petición (?? '' evita valores null)
    const datos: RegistroEmpresaRequest = limpiarTextos({
      nombre: v.nombre ?? '',
      nit: v.nit ?? '',
      correoContacto: v.correoContacto ?? '',
      nombreRepresentante: v.nombreRepresentante ?? '',
      password: v.password ?? '',
    });
    // La contraseña no se recorta: los espacios pueden ser parte de ella
    datos.password = v.password ?? '';

    // Paso 1: registrar la empresa. Paso 2: iniciar sesión con las mismas credenciales
    this.empresaService
      .registrar(datos)
      // Los operadores de RxJS se encadenan dentro de pipe
      .pipe(
        // Registrada la empresa, se inicia sesión con las mismas credenciales
        switchMap(() =>
          this.authService.login({ correo: datos.correoContacto, password: datos.password }).pipe(
            // Si el inicio de sesión falla, no es grave: se manda a la pantalla de login con un aviso
            catchError(() => {
              this.router.navigate(['/login'], { queryParams: { registrada: true } });
              // EMPTY termina el flujo sin emitir nada, así no se ejecuta el next de abajo
              return EMPTY;
            }),
          ),
        ),
        // Siempre vuelve a habilitar el botón al terminar
        finalize(() => this.enviando.set(false)),
      )
      .subscribe({
        // Todo salió bien: se guarda la sesión, se avisa y se va al inicio
        next: (respuesta) => {
          this.sesion.iniciar(respuesta);
          this.notificaciones.exito(`La empresa ${datos.nombre} quedó registrada. Usted es su administrador.`);
          this.router.navigate(['/inicio']);
        },
        // El registro falló (por ejemplo NIT repetido)
        error: (err) => {
          const problema = problemaDe(err);
          // Los errores por campo del backend se muestran en cada campo del formulario
          aplicarErroresDelServidor(this.registroForm, problema);
          // Y el error general se muestra en la alerta de arriba
          this.problema.set(problema);
        },
      });
  }
}
