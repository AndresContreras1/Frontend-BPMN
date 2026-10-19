/** Rol de acceso (HU-02): qué puede hacer el usuario en la aplicación. No se dibuja en el diagrama. */
export type RolAcceso = 'ADMINISTRADOR' | 'EDITOR' | 'LECTOR';

export const ROLES_ACCESO: RolAcceso[] = ['ADMINISTRADOR', 'EDITOR', 'LECTOR'];

/** Usuario autenticado y su empresa (HU-03). */
export interface UsuarioResumen {
  id: number;
  nombre: string;
  correo: string;
  rol: RolAcceso;
  empresaId: number;
  empresaNombre: string;
}

export interface Usuario {
  id: number;
  nombre: string;
  correo: string;
  rol: RolAcceso;
  activo: boolean;
  creadoEn: string;
}

export interface UsuarioRequest {
  nombre: string;
  correo: string;
  rol: RolAcceso;
  passwordInicial: string;
}

export interface LoginRequest {
  correo: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  tipo: string;
  expiraEnSegundos: number;
  usuario: UsuarioResumen;
}
