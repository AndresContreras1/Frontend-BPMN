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
  private readonly empresaService = inject(EmpresaService);
  private readonly authService = inject(AuthService);
  private readonly sesion = inject(SesionStore);
  private readonly notificaciones = inject(NotificacionesService);
  private readonly router = inject(Router);

  enviando = signal(false);
  problema = signal<ProblemDetail | null>(null);

  registroForm = new FormGroup({
    nombre: new FormControl('', [Validators.required, Validators.maxLength(120)]),
    nit: new FormControl('', [Validators.required, Validators.pattern(PATRON_NIT)]),
    correoContacto: new FormControl('', [Validators.required, Validators.email, Validators.maxLength(120)]),
    nombreRepresentante: new FormControl('', [Validators.required, Validators.maxLength(120)]),
    password: new FormControl('', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]),
  });

  mensajesNit = { pattern: 'El NIT debe tener entre 5 y 15 dígitos y, opcional, el dígito de verificación (900123456-1)' };

  handleSubmit(): void {
    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.problema.set(null);
    const v = this.registroForm.value;
    const datos: RegistroEmpresaRequest = limpiarTextos({
      nombre: v.nombre ?? '',
      nit: v.nit ?? '',
      correoContacto: v.correoContacto ?? '',
      nombreRepresentante: v.nombreRepresentante ?? '',
      password: v.password ?? '',
    });
    // La contraseña no se recorta: los espacios pueden ser parte de ella
    datos.password = v.password ?? '';

    this.empresaService
      .registrar(datos)
      .pipe(
        // Registrada la empresa, se inicia sesión con las mismas credenciales
        switchMap(() =>
          this.authService.login({ correo: datos.correoContacto, password: datos.password }).pipe(
            catchError(() => {
              this.router.navigate(['/login'], { queryParams: { registrada: true } });
              return EMPTY;
            }),
          ),
        ),
        finalize(() => this.enviando.set(false)),
      )
      .subscribe({
        next: (respuesta) => {
          this.sesion.iniciar(respuesta);
          this.notificaciones.exito(`La empresa ${datos.nombre} quedó registrada. Usted es su administrador.`);
          this.router.navigate(['/inicio']);
        },
        error: (err) => {
          const problema = problemaDe(err);
          aplicarErroresDelServidor(this.registroForm, problema);
          this.problema.set(problema);
        },
      });
  }
}
