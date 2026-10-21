/** Rol de acceso (HU-02): qué puede hacer el usuario en la aplicación. No se dibuja en el diagrama. */
export type RolAcceso = 'ADMINISTRADOR' | 'EDITOR' | 'LECTOR';

/** Lista de todos los roles de acceso, útil para llenar selectores. */
export const ROLES_ACCESO: RolAcceso[] = ['ADMINISTRADOR', 'EDITOR', 'LECTOR'];

/** Usuario autenticado y su empresa (HU-03). */
export interface UsuarioResumen {
  /** Identificador del usuario. */
  id: number;
  /** Nombre completo. */
  nombre: string;
  /** Correo (se usa para iniciar sesión). */
  correo: string;
  /** Rol de acceso. */
  rol: RolAcceso;
  /** Id de su empresa. */
  empresaId: number;
  /** Nombre de su empresa. */
  empresaNombre: string;
}

/** Usuario tal como lo lista la API de administración de usuarios. */
export interface Usuario {
  /** Identificador del usuario. */
  id: number;
  /** Nombre completo. */
  nombre: string;
  /** Correo. */
  correo: string;
  /** Rol de acceso. */
  rol: RolAcceso;
  /** False si fue desactivado. */
  activo: boolean;
  /** Fecha de creación. */
  creadoEn: string;
}

/** Datos para crear un usuario. */
export interface UsuarioRequest {
  /** Nombre completo. */
  nombre: string;
  /** Correo. */
  correo: string;
  /** Rol de acceso. */
  rol: RolAcceso;
  /** Contraseña con la que empieza el usuario. */
  passwordInicial: string;
}

/** Credenciales para iniciar sesión. */
export interface LoginRequest {
  /** Correo del usuario. */
  correo: string;
  /** Contraseña. */
  password: string;
}

/** Respuesta del login. */
export interface LoginResponse {
  /** Token JWT que se envía en cada petición. */
  token: string;
  /** Tipo de token (Bearer). */
  tipo: string;
  /** Segundos que dura el token antes de vencer. */
  expiraEnSegundos: number;
  /** Datos del usuario que inició sesión. */
  usuario: UsuarioResumen;
}
