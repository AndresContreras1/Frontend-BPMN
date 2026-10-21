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
  private readonly usuarioService = inject(UsuarioService);
  private readonly router = inject(Router);

  readonly roles = ROLES_ACCESO;
  readonly descripcionRol = DESCRIPCION_ROL;
  enviando = signal(false);
  problema = signal<ProblemDetail | null>(null);

  usuarioForm = new FormGroup({
    nombre: new FormControl('', [Validators.required, Validators.maxLength(120)]),
    correo: new FormControl('', [Validators.required, Validators.email, Validators.maxLength(120)]),
    rol: new FormControl<RolAcceso>('EDITOR', { nonNullable: true, validators: [Validators.required] }),
    passwordInicial: new FormControl('', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]),
  });

  handleSubmit(): void {
    if (this.usuarioForm.invalid) {
      this.usuarioForm.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.problema.set(null);
    const v = this.usuarioForm.getRawValue();
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
        next: (creado) => this.router.navigate(['/usuarios'], { queryParams: { creado: creado.nombre } }),
        error: (err) => {
          const problema = problemaDe(err);
          aplicarErroresDelServidor(this.usuarioForm, problema);
          this.problema.set(problema);
        },
      });
  }
}
