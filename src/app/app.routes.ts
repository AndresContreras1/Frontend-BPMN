import { Routes } from '@angular/router';

import { authGuard, invitadoGuard } from './core/guards/auth.guard';
import { rolGuard } from './core/guards/rol.guard';
import { CompartidosComponent } from './pages/compartidos/compartidos.component';
import { LoginComponent } from './pages/login/login.component';
import { MiEmpresaComponent } from './pages/mi-empresa/mi-empresa.component';
import { NoEncontradoComponent } from './pages/no-encontrado/no-encontrado.component';
import { ProcesoDetalleComponent } from './pages/proceso-detalle/proceso-detalle.component';
import { ProcesoFormComponent } from './pages/proceso-form/proceso-form.component';
import { ProcesosComponent } from './pages/procesos/procesos.component';
import { RegistroEmpresaComponent } from './pages/registro-empresa/registro-empresa.component';
import { UsuarioFormComponent } from './pages/usuario-form/usuario-form.component';
import { UsuariosComponent } from './pages/usuarios/usuarios.component';

// Las rutas más específicas van arriba y las genéricas abajo
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'procesos' },

  // Solo invitados (HU-01, HU-03)
  { path: 'login', component: LoginComponent, canActivate: [invitadoGuard] },
  { path: 'registro', component: RegistroEmpresaComponent, canActivate: [invitadoGuard] },

  // Con sesión
  { path: 'empresa', component: MiEmpresaComponent, canActivate: [authGuard] },

  // HU-04 a HU-07: crear y editar solo administrador o editor; el lector consulta
  { path: 'procesos/nuevo', component: ProcesoFormComponent, canActivate: [authGuard, rolGuard], data: { roles: ['ADMINISTRADOR', 'EDITOR'] } },
  { path: 'procesos/editar/:id', component: ProcesoFormComponent, canActivate: [authGuard, rolGuard], data: { roles: ['ADMINISTRADOR', 'EDITOR'] } },
  { path: 'procesos/:id', component: ProcesoDetalleComponent, canActivate: [authGuard] },
  { path: 'procesos', component: ProcesosComponent, canActivate: [authGuard] },

  // HU-23: procesos de otras empresas en solo lectura
  { path: 'compartidos', component: CompartidosComponent, canActivate: [authGuard] },

  // HU-02: todos ven la lista; invitar es solo del administrador
  { path: 'usuarios/nuevo', component: UsuarioFormComponent, canActivate: [authGuard, rolGuard], data: { roles: ['ADMINISTRADOR'] } },
  { path: 'usuarios', component: UsuariosComponent, canActivate: [authGuard] },

  { path: '**', component: NoEncontradoComponent },
];
