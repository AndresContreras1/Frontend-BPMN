import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AlertaErrorComponent } from '../../components/alerta-error/alerta-error.component';
import { CampoErrorComponent } from '../../components/campo-error/campo-error.component';
import { PageTitleComponent } from '../../components/page-title/page-title.component';
import { problemaDe } from '../../core/services/errores';
import { aplicarErroresDelServidor } from '../../core/services/formularios';
import { ProblemDetail } from '../../models/problem-detail.model';
import { RolAcceso, ROLES_ACCESO, UsuarioRequest } from '../../models/usuario.model';
import { UsuarioService } from '../../service/usuario.service';

/** Qué puede hacer cada rol de acceso (se muestra al elegirlo). */
export const DESCRIPCION_ROL: Record<RolAcceso, string> = {
  ADMINISTRADOR: 'Gestiona usuarios, roles de proceso y todos los procesos de la empresa.',
  EDITOR: 'Crea y modela procesos, pools, lanes y elementos del diagrama.',
  LECTOR: 'Solo consulta los procesos y sus diagramas.',
};

/** HU-02: el administrador invita a un usuario con una contraseña inicial y su rol de acceso. */
@Component({
  selector: 'app-usuario-form',
  imports: [ReactiveFormsModule, RouterLink, PageTitleComponent, AlertaErrorComponent, CampoErrorComponent],
  templateUrl: './usuario-form.component.html',
})
export class UsuarioFormComponent {
  /** Servicio que habla con la API de usuarios. */
  private readonly usuarioService = inject(UsuarioService);
  /** Para navegar al listado despues de invitar. */
  private readonly router = inject(Router);

  /** Roles de acceso disponibles, para las opciones del select. */
  readonly roles = ROLES_ACCESO;
  /** Descripcion de cada rol, que se muestra debajo del select. */
  readonly descripcionRol = DESCRIPCION_ROL;
  /** True mientras se envia el formulario (deshabilita el boton). */
  enviando = signal(false);
  /** Error devuelto por la API para mostrarlo en la alerta. */
  problema = signal<ProblemDetail | null>(null);

  /** Formulario reactivo con sus validaciones (los maximos coinciden con los de la API). */
  usuarioForm = new FormGroup({
    nombre: new FormControl('', [Validators.required, Validators.maxLength(120)]),
    correo: new FormControl('', [Validators.required, Validators.email, Validators.maxLength(120)]),
    // nonNullable: nunca vale null; por defecto se invita como EDITOR
    rol: new FormControl<RolAcceso>('EDITOR', { nonNullable: true, validators: [Validators.required] }),
    passwordInicial: new FormControl('', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]),
  });

  /** Envia el formulario y crea el usuario. */
  handleSubmit(): void {
    // Con campos invalidos se marcan como tocados para mostrar los errores y no se envia nada
    if (this.usuarioForm.invalid) {
      this.usuarioForm.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.problema.set(null);
    // getRawValue incluye tambien los campos deshabilitados
    const v = this.usuarioForm.getRawValue();
    // Se limpian espacios de nombre y correo; la contrasena se envia tal cual
    const usuario: UsuarioRequest = {
      nombre: (v.nombre ?? '').trim(),
      correo: (v.correo ?? '').trim(),
      rol: v.rol,
      passwordInicial: v.passwordInicial ?? '',
    };

    this.usuarioService
      .crear(usuario)
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        // Al terminar vuelve al listado y le pasa el nombre para que muestre el aviso de exito
        next: (creado) => this.router.navigate(['/usuarios'], { queryParams: { creado: creado.nombre } }),
        error: (err) => {
          const problema = problemaDe(err);
          // Los errores por campo que reporta la API (por ejemplo correo repetido) se pintan en el formulario
          aplicarErroresDelServidor(this.usuarioForm, problema);
          this.problema.set(problema);
        },
      });
  }
}
