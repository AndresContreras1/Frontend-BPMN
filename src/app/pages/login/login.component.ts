import { Component, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AlertaErrorComponent } from '../../components/alerta-error/alerta-error.component';
import { CampoErrorComponent } from '../../components/campo-error/campo-error.component';
import { problemaDe } from '../../core/services/errores';
import { SesionStore } from '../../core/services/sesion.store';
import { ProblemDetail } from '../../models/problem-detail.model';
import { AuthService } from '../../service/auth.service';

/** HU-03: inicio de sesión con correo y contraseña. */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AlertaErrorComponent, CampoErrorComponent],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly sesion = inject(SesionStore);
  private readonly router = inject(Router);

  /** Parámetros de la URL (withComponentInputBinding). */
  expirada = input<string>();
  registrada = input<string>();
  returnUrl = input<string>();

  enviando = signal(false);
  problema = signal<ProblemDetail | null>(null);

  loginForm = new FormGroup({
    correo: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });

  handleSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.problema.set(null);
    const valores = this.loginForm.value;

    this.authService
      .login({ correo: (valores.correo ?? '').trim(), password: valores.password ?? '' })
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: (respuesta) => {
          this.sesion.iniciar(respuesta);
          this.router.navigateByUrl(this.destino());
        },
        error: (err) => this.problema.set(problemaDe(err)),
      });
  }

  /** Solo se vuelve a rutas internas de la app (evita redirecciones a otros sitios). */
  private destino(): string {
    const url = this.returnUrl();
    return url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/login') ? url : '/';
  }
}
