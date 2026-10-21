import { Routes } from '@angular/router';

import { authGuard, invitadoGuard } from './core/guards/auth.guard';
import { LoginComponent } from './pages/login/login.component';
import { MiEmpresaComponent } from './pages/mi-empresa/mi-empresa.component';
import { NoEncontradoComponent } from './pages/no-encontrado/no-encontrado.component';
import { RegistroEmpresaComponent } from './pages/registro-empresa/registro-empresa.component';

// Las rutas más específicas van arriba y las genéricas abajo
export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'empresa' },

  // Solo invitados (HU-01, HU-03)
  { path: 'login', component: LoginComponent, canActivate: [invitadoGuard] },
  { path: 'registro', component: RegistroEmpresaComponent, canActivate: [invitadoGuard] },

  // Con sesión
  { path: 'empresa', component: MiEmpresaComponent, canActivate: [authGuard] },

  { path: '**', component: NoEncontradoComponent },
];
