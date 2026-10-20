import { Routes } from '@angular/router';

import { authGuard, invitadoGuard } from './core/guards/auth.guard';
import { rolGuard } from './core/guards/rol.guard';
import { NoEncontradoComponent } from './pages/no-encontrado/no-encontrado.component';

const APP = 'Editor BPMN';

/**
 * Cada página se descarga cuando se visita por primera vez (loadComponent): el paquete inicial solo
 * trae la estructura de la app. title cambia el título de la pestaña del navegador.
 * Las rutas más específicas van arriba y las genéricas abajo.
 */
export const routes: Routes = [
  // Página pública; con sesión iniciada el guard lleva al inicio de la empresa
  {
    path: '', pathMatch: 'full', title: APP, canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/bienvenida/bienvenida.component').then((m) => m.BienvenidaComponent),
  },

  // Solo invitados (HU-01, HU-03)
  {
    path: 'login', title: `Iniciar sesión · ${APP}`, canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'registro', title: `Registrar empresa · ${APP}`, canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/registro-empresa/registro-empresa.component').then((m) => m.RegistroEmpresaComponent),
  },

  // Con sesión
  {
    path: 'inicio', title: `Inicio · ${APP}`, canActivate: [authGuard],
    loadComponent: () => import('./pages/inicio/inicio.component').then((m) => m.InicioComponent),
  },
  {
    path: 'empresa', title: `Mi empresa · ${APP}`, canActivate: [authGuard],
    loadComponent: () => import('./pages/mi-empresa/mi-empresa.component').then((m) => m.MiEmpresaComponent),
  },

  // HU-04 a HU-07: crear y editar solo administrador o editor; el lector consulta
  {
    path: 'procesos/nuevo', title: `Nuevo proceso · ${APP}`, canActivate: [authGuard, rolGuard],
    data: { roles: ['ADMINISTRADOR', 'EDITOR'] },
    loadComponent: () => import('./pages/proceso-form/proceso-form.component').then((m) => m.ProcesoFormComponent),
  },
  {
    path: 'procesos/editar/:id', title: `Editar proceso · ${APP}`, canActivate: [authGuard, rolGuard],
    data: { roles: ['ADMINISTRADOR', 'EDITOR'] },
    loadComponent: () => import('./pages/proceso-form/proceso-form.component').then((m) => m.ProcesoFormComponent),
  },
  // Editor del diagrama: todos lo ven; cambiar exige administrador o editor (la API lo valida)
  {
    path: 'procesos/:id/diagrama', title: `Diagrama · ${APP}`, canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/editor/proceso-editor-page/proceso-editor-page.component').then((m) => m.ProcesoEditorPageComponent),
  },
  {
    path: 'procesos/:id', title: `Proceso · ${APP}`, canActivate: [authGuard],
    loadComponent: () => import('./pages/proceso-detalle/proceso-detalle.component').then((m) => m.ProcesoDetalleComponent),
  },
  {
    path: 'procesos', title: `Procesos · ${APP}`, canActivate: [authGuard],
    loadComponent: () => import('./pages/procesos/procesos.component').then((m) => m.ProcesosComponent),
  },

  // HU-17 a HU-20: catálogo de roles de proceso
  {
    path: 'roles', title: `Roles de proceso · ${APP}`, canActivate: [authGuard],
    loadComponent: () => import('./pages/roles-proceso/roles-proceso.component').then((m) => m.RolesProcesoComponent),
  },

  // HU-23: procesos de otras empresas en solo lectura
  {
    path: 'compartidos', title: `Compartidos conmigo · ${APP}`, canActivate: [authGuard],
    loadComponent: () => import('./pages/compartidos/compartidos.component').then((m) => m.CompartidosComponent),
  },

  // HU-02: todos ven la lista; invitar es solo del administrador
  {
    path: 'usuarios/nuevo', title: `Invitar usuario · ${APP}`, canActivate: [authGuard, rolGuard],
    data: { roles: ['ADMINISTRADOR'] },
    loadComponent: () => import('./pages/usuario-form/usuario-form.component').then((m) => m.UsuarioFormComponent),
  },
  {
    path: 'usuarios', title: `Usuarios · ${APP}`, canActivate: [authGuard],
    loadComponent: () => import('./pages/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
  },

  // Siempre al final: cualquier otra URL
  { path: '**', title: `Página no encontrada · ${APP}`, component: NoEncontradoComponent },
];
