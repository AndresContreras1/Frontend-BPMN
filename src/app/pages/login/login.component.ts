import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
export class LoginComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly sesion = inject(SesionStore);
  private readonly router = inject(Router);

  private readonly route = inject(ActivatedRoute);

  /** Parámetros de la URL: ?expirada (HU-03), ?registrada (HU-01) y ?returnUrl (la ruta que pidió el guard). */
  expirada = signal<string | null>(null);
  registrada = signal<string | null>(null);
  returnUrl = signal<string | null>(null);

  enviando = signal(false);
  problema = signal<ProblemDetail | null>(null);

  loginForm = new FormGroup({
    correo: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
  });

  ngOnInit(): void {
    const parametros = this.route.snapshot.queryParamMap;
    this.expirada.set(parametros.get('expirada'));
    this.registrada.set(parametros.get('registrada'));
    this.returnUrl.set(parametros.get('returnUrl'));
  }

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
