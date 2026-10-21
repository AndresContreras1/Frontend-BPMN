import { Routes } from '@angular/router';

import { authGuard, invitadoGuard } from './core/guards/auth.guard';
import { rolGuard } from './core/guards/rol.guard';
import { NoEncontradoComponent } from './pages/no-encontrado/no-encontrado.component';

// Sufijo común de los títulos de pestaña
const APP = 'Editor BPMN';

/**
 * Cada página se descarga cuando se visita por primera vez (loadComponent): el paquete inicial solo
 * trae la estructura de la app. title cambia el título de la pestaña del navegador.
 * Las rutas más específicas van arriba y las genéricas abajo.
 * canActivate lista los guards que se revisan antes de entrar: authGuard pide sesión,
 * invitadoGuard exige NO tenerla y rolGuard valida el rol (data.roles).
 */
export const routes: Routes = [
  // Página pública; con sesión iniciada el guard lleva al inicio de la empresa
  {
    path: '', pathMatch: 'full', title: APP, canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/bienvenida/bienvenida.component').then((m) => m.BienvenidaComponent),
  },

  // Solo invitados (HU-01, HU-03)
  // Inicio de sesión
  {
    path: 'login', title: `Iniciar sesión · ${APP}`, canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
  // Registro de una empresa nueva
  {
    path: 'registro', title: `Registrar empresa · ${APP}`, canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/registro-empresa/registro-empresa.component').then((m) => m.RegistroEmpresaComponent),
  },

  // Con sesión
  // Página de inicio con los indicadores
  {
    path: 'inicio', title: `Inicio · ${APP}`, canActivate: [authGuard],
    loadComponent: () => import('./pages/inicio/inicio.component').then((m) => m.InicioComponent),
  },
  // Datos de la empresa del usuario
  {
    path: 'empresa', title: `Mi empresa · ${APP}`, canActivate: [authGuard],
    loadComponent: () => import('./pages/mi-empresa/mi-empresa.component').then((m) => m.MiEmpresaComponent),
  },

  // HU-04 a HU-07: crear y editar solo administrador o editor; el lector consulta
  // Crear proceso (el mismo componente sirve para crear y para editar)
  {
    path: 'procesos/nuevo', title: `Nuevo proceso · ${APP}`, canActivate: [authGuard, rolGuard],
    data: { roles: ['ADMINISTRADOR', 'EDITOR'] },
    loadComponent: () => import('./pages/proceso-form/proceso-form.component').then((m) => m.ProcesoFormComponent),
  },
  // Editar proceso; :id es el parámetro con el id del proceso
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
  // Detalle de un proceso (va después de las rutas con más segmentos para no taparlas)
  {
    path: 'procesos/:id', title: `Proceso · ${APP}`, canActivate: [authGuard],
    loadComponent: () => import('./pages/proceso-detalle/proceso-detalle.component').then((m) => m.ProcesoDetalleComponent),
  },
  // Lista de procesos
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
  // Formulario para invitar un usuario (antes de 'usuarios' por ser más específica)
  {
    path: 'usuarios/nuevo', title: `Invitar usuario · ${APP}`, canActivate: [authGuard, rolGuard],
    data: { roles: ['ADMINISTRADOR'] },
    loadComponent: () => import('./pages/usuario-form/usuario-form.component').then((m) => m.UsuarioFormComponent),
  },
  // Lista de usuarios de la empresa
  {
    path: 'usuarios', title: `Usuarios · ${APP}`, canActivate: [authGuard],
    loadComponent: () => import('./pages/usuarios/usuarios.component').then((m) => m.UsuariosComponent),
  },

  // Siempre al final: cualquier otra URL (** coincide con todo lo que no encajó arriba)
  { path: '**', title: `Página no encontrada · ${APP}`, component: NoEncontradoComponent },
];
