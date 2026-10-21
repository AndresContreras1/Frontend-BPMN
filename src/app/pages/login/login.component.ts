import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AlertaErrorComponent } from '../../components/alerta-error/alerta-error.component';
import { CampoErrorComponent } from '../../components/campo-error/campo-error.component';
import { problemaDe } from '../../core/services/errores';
import { NotificacionesService } from '../../core/services/notificaciones.service';
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
  // Servicios y herramientas que usa la pantalla
  // Llama a la API para iniciar sesión
  private readonly authService = inject(AuthService);
  // Guarda la sesión (token y usuario) al ingresar
  private readonly sesion = inject(SesionStore);
  // Muestra el aviso de bienvenida
  private readonly notificaciones = inject(NotificacionesService);
  // Para cambiar de página después de ingresar
  // Para leer los parámetros de la URL
  private readonly router = inject(Router);

  private readonly route = inject(ActivatedRoute);

  /** Parámetros de la URL: ?expirada (HU-03), ?registrada (HU-01) y ?returnUrl (la ruta que pidió el guard). */
  expirada = signal<string | null>(null);
  registrada = signal<string | null>(null);
  returnUrl = signal<string | null>(null);

  /** true mientras se espera la respuesta; deshabilita el botón para no enviar dos veces. */
  enviando = signal(false);
  /** Error devuelto por la API (por ejemplo credenciales incorrectas). */
  problema = signal<ProblemDetail | null>(null);

  /** Formulario reactivo: correo con formato válido y contraseña, ambos obligatorios. */
  loginForm = new FormGroup({
    // Obligatorio y con formato de correo
    correo: new FormControl('', [Validators.required, Validators.email]),
    // Obligatoria; en el login no se revisa el largo, eso lo decide el backend
    password: new FormControl('', [Validators.required]),
  });

  /** Al abrir la pantalla se leen los parámetros de la URL. */
  ngOnInit(): void {
    // snapshot toma los parámetros que había al entrar a la ruta
    const parametros = this.route.snapshot.queryParamMap;
    this.expirada.set(parametros.get('expirada'));
    this.registrada.set(parametros.get('registrada'));
    this.returnUrl.set(parametros.get('returnUrl'));
  }

  /** Se ejecuta al enviar el formulario. */
  handleSubmit(): void {
    // Si hay errores se marcan todos los campos para mostrarlos y no se envía nada
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    // Se bloquea el botón y se borra el error anterior
    this.enviando.set(true);
    this.problema.set(null);
    // Valores actuales del formulario
    const valores = this.loginForm.value;

    // El correo se recorta por si quedaron espacios; la contraseña va tal cual
    this.authService
      .login({ correo: (valores.correo ?? '').trim(), password: valores.password ?? '' })
      // finalize corre siempre (con éxito o con error) y vuelve a habilitar el botón
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        // Éxito: se guarda la sesión, se avisa y se va a la ruta que se pidió o al inicio
        next: (respuesta) => {
          this.sesion.iniciar(respuesta);
          this.notificaciones.exito(`Bienvenido(a), ${respuesta.usuario.nombre}.`);
          this.router.navigateByUrl(this.destino());
        },
        // Error: se muestra la alerta
        error: (err) => this.problema.set(problemaDe(err)),
      });
  }

  /** Solo se vuelve a rutas internas de la app (evita redirecciones a otros sitios); si no, al inicio. */
  private destino(): string {
    // Ruta a la que el usuario quería ir antes de que lo mandaran a iniciar sesión
    const url = this.returnUrl();
    // Se acepta solo si empieza por "/" (ruta interna), no por "//" (otro sitio) ni por "/login" (evita un ciclo)
    return url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/login') ? url : '/inicio';
  }
}
